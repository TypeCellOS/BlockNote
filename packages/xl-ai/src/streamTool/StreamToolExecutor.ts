import { getErrorMessage } from "@ai-sdk/provider-utils";
import { parsePartialJson } from "ai";
import { ChunkExecutionError } from "./ChunkExecutionError.js";
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

  metadata: any;
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
  private stream:
    | undefined
    | (TransformStream<
        string | Operation<T>,
        {
          status: "ok";
          chunk: Operation<T>;
        }
      > & {
        finishPromise: Promise<void>;
      });

  /**
   * @param streamTools - The StreamTools to use to apply the StreamToolCalls
   * @param abortSignal - Optional AbortSignal to cancel ongoing operations
   */
  constructor(
    private streamTools: T,
    private abortSignal?: AbortSignal,
  ) {
    // this.stream = this.createStream();
  }

  async init() {
    this.stream = await this.createStream();
  }

  private async createStream() {
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

    // - internal dummy sink ensures all downstream writes are completed.
    // - pipeline.close() waits for both the first writable to close and the pipe to finish internally, so the consumer doesn’t need to know about internal transforms.
    // - Works regardless of the number of internal transforms.
    // - The readable can still be exposed if the consumer wants it, but they don’t have to consume it for close() to guarantee processing is done.

    const secondTransform = stream.readable.pipeThrough(
      await this.createExecutor(),
    );

    const [internalReadable, externalReadable] = secondTransform.tee();

    // internalReadable goes to the dummy sink
    const finishPromise = internalReadable.pipeTo(new WritableStream());

    return {
      writable: stream.writable,
      // expose externalReadable to the consumer
      readable: externalReadable,
      finishPromise,
    };
  }

  private async createExecutor() {
    const executors = await Promise.all(
      this.streamTools.map((tool) => tool.executor()),
    );

    return new TransformStream<
      Operation<T>,
      { status: "ok"; chunk: Operation<T> }
    >({
      transform: async (chunk, controller) => {
        let handled = false;
        for (const executor of executors) {
          try {
            // Pass the signal to executor - it should handle abort internally
            const result = await executor.execute(chunk, this.abortSignal);
            if (result) {
              controller.enqueue({ status: "ok", chunk });
              handled = true;
              break;
            }
          } catch (error) {
            controller.error(
              new ChunkExecutionError(
                `Tool execution failed: ${getErrorMessage(error)}`,
                chunk,
                {
                  cause: error,
                  aborted: this.abortSignal?.aborted ?? false,
                },
              ),
            );
            return;
          }
        }
        if (!handled) {
          const operationType = (chunk.operation as any)?.type || "unknown";
          controller.error(
            new Error(
              `No tool could handle operation of type: ${operationType}`,
            ),
          );
          return;
        }
      },
    });
  }

  /**
   * Returns a WritableStream that can be used to write StreamToolCalls to the executor.
   *
   * The WriteableStream accepts JSON strings or Operation objects.
   *
   * Make sure to call `close` on the StreamToolExecutor instead of on the writable returned here!
   */
  public get writable() {
    if (!this.stream) {
      throw new Error("StreamToolExecutor not initialized");
    }
    return this.stream.writable;
  }

  /**
   * Returns a ReadableStream that can be used to read the results of the executor.
   */
  public get readable() {
    if (!this.stream) {
      throw new Error("StreamToolExecutor not initialized");
    }
    return this.stream.readable;
  }

  public async finish() {
    if (!this.stream) {
      throw new Error("StreamToolExecutor not initialized");
    }
    await this.stream.finishPromise;
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

      await writer.write(chunk);
    }
    await writer.close();
    await this.finish();
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
    await this.finish();
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
          metadata: {},
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
      metadata: undefined,
    };
  } else {
    // no worries, probably a partial operation that's not valid yet
    return;
  }
}
