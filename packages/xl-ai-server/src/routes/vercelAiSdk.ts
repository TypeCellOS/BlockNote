import { createOpenAI } from "@ai-sdk/openai";
import {
  createStreamToolsArraySchema,
  objectToUIMessageStream,
  partialObjectStreamToUIMessageStream,
} from "@blocknote/xl-ai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  jsonSchema,
  streamObject,
  streamText,
} from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const vercelAiSdkRoute = new Hono();

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

// TODO: add support for generateText + tools
vercelAiSdkRoute.post("/generateText", cors(), async (c) => {
  // TODO
  const { messages } = await c.req.json();

  const result = generateText({
    model,
    messages: convertToModelMessages(messages),
    tools: {
      // add: tool({}),
    },
  });

  return result as any;
  // return result.toDataStreamResponse();
});

// TODO: add support for streamText + tools
vercelAiSdkRoute.post("/streamText", cors(), async (c) => {
  // TODO
  const { messages } = await c.req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools: {
      // add: tool({}),
    },
  });

  return result.toUIMessageStreamResponse();
});

vercelAiSdkRoute.post("/streamObject", cors(), async (c) => {
  const { messages, streamTools } = await c.req.json();
  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));
  const result = streamObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = partialObjectStreamToUIMessageStream(result.fullStream);

  return createUIMessageStreamResponse({ stream });
});

vercelAiSdkRoute.post("/generateObject", cors(), async (c) => {
  const { messages, streamTools } = await c.req.json();
  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));

  const result = await generateObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = objectToUIMessageStream(result.object);

  return createUIMessageStreamResponse({ stream });
});
