import { ApplyOperationResult } from "../executor/streamOperations/applyOperations.js";
import { OperationsResult } from "../streamTool/callLLMWithStreamTools.js";
import { AsyncIterableStream } from "../util/stream.js";

/**
 * Result of an LLM call with stream tools that apply changes to a BlockNote Editor
 */
export class CallLLMResult {
  /**
   * @internal
   */
  constructor(
    /**
     * Result of the underlying LLM call. Use this to access operations the LLM decided to execute, but without applying them.
     * (usually this is only used for advanced used cases or debugging)
     */
    public readonly llmResult: OperationsResult<any>,

    private readonly createApplyToolCallsStream: () => AsyncIterableStream<
      ApplyOperationResult<any>
    >
  ) {}

  /**
   * Apply the operations to the editor and return a stream of results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  get applyToolCallsStream() {
    // TODO: add test that you cannot call this twice
    return this.createApplyToolCallsStream();
  }

  /**
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  public async execute() {
    for await (const _result of this.applyToolCallsStream) {
      // no op
    }
  }
}
