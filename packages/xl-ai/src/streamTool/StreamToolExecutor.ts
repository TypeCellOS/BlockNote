import { parsePartialJson } from "ai";
import {
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../util/stream.js";
import { filterNewOrUpdatedOperations } from "./filterNewOrUpdatedOperations.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";

/**
 * The Operation types wraps a StreamToolCall with metadata on whether
 * it's an update to an existing and / or or a possibly partial (i.e.: incomplete, streaming in progress) operation
 */
type Operation<T extends StreamTool<any>[] | StreamTool<any>> = {
  /**
   * The StreamToolCall (parameters representing a StreamTool invocation)
   */
  operation: StreamToolCall<T>;
  /**
   * Whether this operation is an update to the previous operation
   * (i.e.: the previous operation was a partial operation for which we now have additional data)
   */
  isUpdateToPreviousOperation: boolean;
  /**
   * Whether this operation is a partial operation
   * (i.e.: incomplete, streaming in progress)
   */
  isPossiblyPartial: boolean;
};

/**
 * The StreamToolExecutor can apply StreamToolCalls to an editor.
 *
 * It accepts StreamToolCalls as JSON strings or already parsed and validated Operations.
 * Note: When passing JSON strings, the executor will parse and validate them into Operations.
 *       When passing Operations, they're expected to have been validated by the StreamTool instances already.
 *       (StreamTool.validate)
 *
 * Applying the operations is delegated to the StreamTool instances.
 *
 * @example see the `manual-execution` example
 */
export class StreamToolExecutor<T extends StreamTool<any>[]> {
  private readonly stream: TransformStream<string | Operation<T>, Operation<T>>;
  private readonly readable: ReadableStream<Operation<T>>;

  /**
   * @param streamTools - The StreamTools to use to apply the StreamToolCalls
   */
  constructor(private streamTools: T) {
    this.stream = this.createWriteStream();
    this.readable = this.createReadableStream();
  }

  private createWriteStream() {
    let lastParsedResult: Operation<T> | undefined;

    const stream = new TransformStream<string | Operation<T>, Operation<T>>({
      transform: async (chunk, controller) => {
        const operation =
          typeof chunk === "string"
            ? await partialJsonToOperation(
                chunk,
                lastParsedResult?.isPossiblyPartial ?? false,
                this.streamTools,
              )
            : chunk;
        if (operation) {
          // TODO: string operations have been validated, but object-based operations have not.
          // To make this consistent, maybe we should extract the string parser to a separate transformer
          lastParsedResult = operation;
          controller.enqueue(operation);
        }
      },

      flush: (controller) => {
        // Check if the stream ended with a partial operation
        if (lastParsedResult?.isPossiblyPartial) {
          controller.error(new Error("stream ended with a partial operation"));
        }
      },
    });

    return stream;
  }

  private createReadableStream() {
    // this is a bit hacky as it mixes async iterables and streams
    // would be better to stick to streams
    let currentStream: AsyncIterable<Operation<StreamTool<any>[]>> =
      createAsyncIterableStream(this.stream.readable);
    for (const tool of this.streamTools) {
      currentStream = tool.execute(currentStream);
    }

    return asyncIterableToStream(currentStream);
  }

  /**
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   */
  public async waitTillEnd() {
    const iterable = createAsyncIterableStream(this.readable);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _result of iterable) {
      // no op
      // these will be operations without a matching StreamTool.
      // (we probably want to allow a way to access and handle these, but for now we haven't run into this scenario yet)
    }
  }

  /**
   * Returns a WritableStream that can be used to write StreamToolCalls to the executor.
   *
   * The WriteableStream accepts JSON strings or Operation objects.
   */
  public get writable() {
    return this.stream.writable;
  }

  async executeOperationsArray(source: AsyncIterable<string>) {
    const writer = this.writable.getWriter();
    for await (const chunk of source) {
      const parsed = await parsePartialJson(chunk);

      if (
        parsed.state === "undefined-input" ||
        parsed.state === "failed-parse"
      ) {
        return undefined;
      }

      if (!parsed) {
        return;
      }

      filterNewOrUpdatedOperations;
      await writer.write(chunk);
    }
    await writer.close();
  }

  /**
   * Accepts an async iterable and writes each chunk to the internal stream.
   *
   * (alternative to writing to the writable stream using {@link writable})
   */
  async execute(source: AsyncIterable<string | Operation<T>>): Promise<void> {
    const writer = this.writable.getWriter();
    for await (const chunk of source) {
      await writer.write(chunk);
    }
    await writer.close();
  }

  /**
   * Accepts a single chunk and processes it using the same logic.
   *
   * (alternative to writing to the writable stream using {@link writable})
   */
  async executeOne(chunk: StreamToolCall<T>): Promise<void> {
    await this.execute(
      (async function* () {
        yield {
          operation: chunk,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      })(),
    );
  }
}

async function partialJsonToOperation<T extends StreamTool<any>[]>(
  chunk: string,
  isUpdateToPreviousOperation: boolean,
  streamTools: T,
): Promise<Operation<T> | undefined> {
  const parsed = await parsePartialJson(chunk);

  if (parsed.state === "undefined-input" || parsed.state === "failed-parse") {
    return undefined;
  }

  if (!parsed) {
    return;
  }

  const func = streamTools.find((f) => f.name === (parsed.value as any)?.type);

  const validated = func && func.validate(parsed.value);

  if (validated?.ok) {
    return {
      operation: validated.value as StreamToolCall<T>,
      isPossiblyPartial: parsed.state === "repaired-parse",
      isUpdateToPreviousOperation,
    };
  } else {
    // no worries, probably a partial operation that's not valid yet
    return;
  }
}
