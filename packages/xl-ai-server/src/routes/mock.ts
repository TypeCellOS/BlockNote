import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";

export const regularRoute = new Hono();

/**
 * Hardcoded response that can be used for manual testing / demo purposes
 *
 * It follows the regular `streamText` pattern of the AI SDK:
 * https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext
 */

const MANUAL_TOOL_CALLS = [
  {
    toolName: "applyDocumentOperations",
    toolCallId: Math.random().toString(36).substring(2),
    args: {
      operations: [
        {
          type: "add",
          referenceId: "blockId",
          position: "after",
          blocks: [
            "<p>BlockNote is an <strong>open source block-based editor</strong>:</p>",
            "<ul><li>Built-in UI components for a modern, customizable UX</li></ul>",
            "<ul><li>Intuitive developer experience</li></ul>",
            "<ul><li>...</li></ul>",
          ],
        },
      ],
    },
  },
];

// Use `streamText` to stream text responses from the LLM
regularRoute.post("/streamText", async (c) => {
  const { messages } = await c.req.json();
  const blockId =
    messages[messages.length - 1].metadata.documentState.blocks[0].id;
  console.log(blockId);
  MANUAL_TOOL_CALLS[0].args.operations[0].referenceId = blockId;
  const stream = createUIMessageStream<any>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 1. Send initial status (transient - won't be added to message history)
      writer.write({
        type: "tool-input-start",
        toolCallId: MANUAL_TOOL_CALLS[0].toolCallId,
        toolName: MANUAL_TOOL_CALLS[0].toolName,
      });

      writer.write({
        type: "tool-input-available",
        toolName: MANUAL_TOOL_CALLS[0].toolName,
        toolCallId: MANUAL_TOOL_CALLS[0].toolCallId,
        input: MANUAL_TOOL_CALLS[0].args,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
});
