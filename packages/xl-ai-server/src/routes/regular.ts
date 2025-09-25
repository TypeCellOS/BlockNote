import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, jsonSchema, streamText, tool } from "ai";
import { Hono } from "hono";

export const regularRoute = new Hono();

/**
 * This is the recommended (regular) way to stream text responses from the LLM
 * to BlockNote clients
 *
 * It follows the regular `streamText` pattern of the AI SDK:
 * https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext
 */

// Setup your model
const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

// Use `streamText` to stream text responses from the LLM
regularRoute.post("/streamText", async (c) => {
  const { messages, streamTools } = await c.req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools: {
      applyDocumentOperations: tool({
        name: "applyDocumentOperations", // TODO
        inputSchema: jsonSchema(streamTools),
        outputSchema: jsonSchema({ type: "object" }),
      }),
    },
    toolChoice: "required",
  });

  return result.toUIMessageStreamResponse();
});
