import { CoreMessage } from "ai";
import { OperationsResult } from "../streamTool/callLLMWithStreamTools.js";
import { StreamTool, StreamToolCall } from "../streamTool/streamTool.js";
import { createAsyncIterableStreamFromAsyncIterable } from "../util/stream.js";

/**
 * Result of an LLM call with stream tools that apply changes to a BlockNote Editor
 */
export class LLMResponse {
  /**
   * @internal
   */
  constructor(
    /**
     * The messages sent to the LLM
     */
    public readonly messages: CoreMessage[],
    /**
     * Result of the underlying LLM call. Use this to access operations the LLM decided to execute, but without applying them.
     * (usually this is only used for advanced used cases or debugging)
     */
    public readonly llmResult: OperationsResult<any>,

    private readonly streamTools: StreamTool<any>[],
  ) {}

  /**
   * Apply the operations to the editor and return a stream of results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  async *applyToolCalls() {
    let currentStream: AsyncIterable<{
      operation: StreamToolCall<StreamTool<any>[]>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    }> = this.llmResult.operationsSource;
    for (const tool of this.streamTools) {
      currentStream = tool.execute(currentStream);
    }
    yield* currentStream;
  }

  /**
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  public async execute() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _result of this.applyToolCalls()) {
      // no op
    }
  }

  /**
   * @internal
   */
  public async _logToolCalls() {
    for await (const toolCall of this.llmResult.operationsSource) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(toolCall, null, 2));
    }
  }

  /**
   * Create a LLMResponse from an array of operations.
   *
   * Note: This is a temporary helper, we'll make it easier to create this from streaming data if required
   */
  public static fromArray<T extends StreamTool<any>[]>(
    messages: CoreMessage[],
    streamTools: StreamTool<any>[],
    operations: StreamToolCall<T>[],
  ): LLMResponse {
    return new LLMResponse(
      messages,
      OperationsResultFromArray(operations),
      streamTools,
    );
  }
}

function OperationsResultFromArray<T extends StreamTool<any>[]>(
  operations: StreamToolCall<T>[],
): OperationsResult<T> {
  async function* singleChunkGenerator() {
    for (const op of operations) {
      yield {
        operation: op,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }
  }

  return {
    streamObjectResult: undefined,
    generateObjectResult: undefined,
    get operationsSource() {
      return createAsyncIterableStreamFromAsyncIterable(singleChunkGenerator());
    },
    async getGeneratedOperations() {
      return { operations };
    },
  };
}
