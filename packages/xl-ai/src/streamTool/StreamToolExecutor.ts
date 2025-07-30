import { parsePartialJson } from "@ai-sdk/ui-utils";
import {
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../util/stream.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";

// update previous

function partialJsonToOperation(
  chunk: string,
  isUpdateToPreviousOperation: boolean,
  streamTools: StreamTool<any>[],
) {
  const parsed = parsePartialJson(chunk);

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
      operation: parsed.value as StreamToolCall<StreamTool<any>[]>,
      isPossiblyPartial: parsed.state === "repaired-parse",
      isUpdateToPreviousOperation,
    };
  } else {
    // no worries, probably a partial operation that's not valid yet
    return;
  }
}

type Operation<T extends StreamTool<any>[] | StreamTool<any>> = {
  operation: StreamToolCall<T>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
};

export class StreamToolExecutor<T extends StreamTool<any>[]> {
  private readonly stream: TransformStream<string | Operation<T>, Operation<T>>;
  private readonly readable: ReadableStream<Operation<T>>;

  constructor(private streamTools: T) {
    this.stream = this.createWriteStream();
    this.readable = this.createReadableStream();
  }
  /**
   * Returns a WritableStream that collects written chunks.
   */
  private createWriteStream() {
    let lastParsedResult: Operation<T> | undefined;

    const stream = new TransformStream<string | Operation<T>, Operation<T>>({
      transform: (chunk, controller) => {
        const operation =
          typeof chunk === "string"
            ? partialJsonToOperation(
                chunk,
                lastParsedResult?.isPossiblyPartial ?? false,
                this.streamTools,
              )
            : chunk;
        if (operation) {
          // TODO: string operations have been validated, but object-based operations have not. make this consistent?
          controller.enqueue(operation);
        }
      },

      // close: () => {
      //     if (lastParsedResult?.isPossiblyPartial) {
      //         throw new Error("stream ended with a partial operation");
      //     }
      // }
    });

    return stream;
  }

  public get writable() {
    return this.stream.writable;
  }

  private createReadableStream() {
    // TODO: this is a bit hacky as it mixes async iterables and streams
    let currentStream: AsyncIterable<Operation<StreamTool<any>[]>> =
      createAsyncIterableStream(this.stream.readable);
    for (const tool of this.streamTools) {
      currentStream = tool.execute(currentStream);
    }

    return asyncIterableToStream(currentStream);
  }

  /**
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  public async waitTillEnd() {
    const iterable = createAsyncIterableStream(this.readable);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _result of iterable) {
      // no op
    }
  }

  /**
   * Accepts an async iterable and writes each chunk to the internal stream.
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

/* TODO:

AI SDK integration:
- pass tools
- server side
- stream tool outputs (partial-tool-data)

Hook up custom executors

*/
