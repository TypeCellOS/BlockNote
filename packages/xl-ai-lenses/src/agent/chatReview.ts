import type { UIMessage } from "ai";

import type { ToolCallReview } from "../tools/documentTools.js";

/**
 * Returns the messages of a chat with the decisions of a user in the
 * outputs of the tool calls: `review` is `accepted` or `rejected`.
 *
 * The output of a tool call is what the model gets for that call in each
 * later run (`describeWrite`). Thus, the agent knows that a user rejected
 * a change, and does not make it again. A chat window shows the same field.
 *
 * The messages do not change if no tool call of `decisions` is in them.
 */
export function recordReview(
  messages: readonly UIMessage[],
  decisions: ReadonlyMap<string, ToolCallReview>,
): UIMessage[] {
  if (decisions.size === 0) {
    return [...messages];
  }
  return messages.map((message) => {
    let changed = false;
    const parts = message.parts.map((part) => {
      // A tool part of the AI SDK has the type `tool-<name>`, the tool call
      // ID, and the output when the tool ended.
      const tool = part as {
        type: string;
        toolCallId?: unknown;
        state?: unknown;
        output?: unknown;
      };
      const review =
        tool.type.startsWith("tool-") && typeof tool.toolCallId === "string"
          ? decisions.get(tool.toolCallId)
          : undefined;
      if (
        review === undefined ||
        tool.state !== "output-available" ||
        typeof tool.output !== "object" ||
        tool.output === null
      ) {
        return part;
      }
      changed = true;
      return { ...part, output: { ...tool.output, review } } as typeof part;
    });
    return changed ? { ...message, parts } : message;
  });
}
