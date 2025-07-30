import { CoreMessage } from "ai";
import { OperationsResult } from "../streamTool/callLLMWithStreamTools.js";
import { StreamTool } from "../streamTool/streamTool.js";
import { StreamToolExecutor } from "../streamTool/StreamToolExecutor.js";

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
   * Helper method to apply all operations to the editor if you're not interested in intermediate operations and results.
   *
   * (this method consumes underlying streams in `llmResult`)
   */
  public async execute() {
    const executor = new StreamToolExecutor(this.streamTools);
    await executor.execute(this.llmResult.operationsSource);
    await executor.waitTillEnd();
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
}
