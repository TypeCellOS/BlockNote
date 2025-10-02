import { createOpenAI } from "@ai-sdk/openai";
import { toolDefinitionsToToolSet } from "@blocknote/xl-ai";
import { convertToModelMessages, streamText } from "ai";
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
  const { messages, toolDefinitions } = await c.req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools: toolDefinitionsToToolSet(toolDefinitions),
    toolChoice: "required",
  });

  return result.toUIMessageStreamResponse();
});
