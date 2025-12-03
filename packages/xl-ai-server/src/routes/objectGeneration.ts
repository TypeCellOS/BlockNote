import { createOpenAI } from "@ai-sdk/openai";
import {
  objectAsToolCallInUIMessageStream,
  partialObjectStreamAsToolCallInUIMessageStream,
} from "@blocknote/xl-ai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";
import { Hono } from "hono";

export const objectGenerationRoute = new Hono();

/*
 * For specific cases where you need to use `generateObject` or `streamObject` (use object generation instead of text streaming)
 * you can follow the examples below. Note: most LLMs work better with text streaming.
 *
 * NOTE: the recommended way to use object generation is to use `streamText` (see regular route).
 */

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

objectGenerationRoute.post("/streamObject", async (c) => {
  const { messages, toolDefinitions } = await c.req.json();

  // (we assume there is only one tool definition passed and that should be used for object generation)
  const toolName = Object.keys(toolDefinitions)[0];

  const schema = jsonSchema(toolDefinitions[toolName].inputSchema);
  const result = streamObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = partialObjectStreamAsToolCallInUIMessageStream(
    result.fullStream,
    toolName,
  );

  return createUIMessageStreamResponse({ stream });
});

objectGenerationRoute.post("/generateObject", async (c) => {
  const { messages, toolDefinitions } = await c.req.json();

  // (we assume there is only one tool definition passed and that should be used for object generation)
  const toolName = Object.keys(toolDefinitions)[0];

  const schema = jsonSchema(toolDefinitions[toolName].inputSchema);

  const result = await generateObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = objectAsToolCallInUIMessageStream(result.object, toolName);

  return createUIMessageStreamResponse({ stream });
});
