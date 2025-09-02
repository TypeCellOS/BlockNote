import { ModelMessage } from "ai";
import { StreamTool, StreamToolCall } from "../streamTool/streamTool.js";
import { StreamToolExecutor } from "../streamTool/StreamToolExecutor.js";
import { AsyncIterableStream } from "../util/stream.js";

/**
 * Result of an LLM call with stream tools
 */
export type OperationsResult<T extends StreamTool<any>[]> =
  AsyncIterableStream<{
    /**
     * The operation the LLM wants to execute
     */
    operation: StreamToolCall<T>;
    /**
     * Whether {@link operation} is an update to the previous operation in the stream.
     *
     * For non-streaming mode, this will always be `false`
     */
    isUpdateToPreviousOperation: boolean;
    /**
     * Whether the {@link operation} is possibly partial (i.e. the LLM is still streaming data about this operation)
     *
     * For non-streaming mode, this will always be `false`
     */
    isPossiblyPartial: boolean;
  }>;

/**
 * Result of an LLM call with stream tools that apply changes to a BlockNote Editor
 *
 * TODO: maybe get rid of this class?
 */
export class LLMResponse {
  /**
   * @internal
   */
  constructor(
    /**
     * The messages sent to the LLM
     */
    public readonly messages: ModelMessage[],
    /**
     * Result of the underlying LLM call. Use this to access operations the LLM decided to execute, but without applying them.
     * (usually this is only used for advanced used cases or debugging)
     */
    public readonly llmResult: OperationsResult<any>,

    private readonly streamTools: StreamTool<any>[],
  ) {}

  /**
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  public async execute() {
    const executor = new StreamToolExecutor(this.streamTools);
    await executor.execute(this.llmResult);
    await executor.waitTillEnd();
  }

  /**
   * @internal
   *
   *  TODO
   */
  public async _logToolCalls() {
    for await (const toolCall of this.llmResult) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(toolCall, null, 2));
    }
  }
}

// TODO
// async getGeneratedOperations() {
//   return { operations };
// },
// }
