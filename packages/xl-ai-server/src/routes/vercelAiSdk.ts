import { createOpenAI } from "@ai-sdk/openai";
import {
  objectToUIMessageStream,
  partialObjectStreamToUIMessageStream,
} from "@blocknote/xl-ai";
import {
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
})("gpt-4-turbo");

// TODO: add support for generateText + tools
vercelAiSdkRoute.post("/generateText", cors(), async (c) => {
  // TODO
  const { messages } = await c.req.json();

  const result = generateText({
    model,
    messages,
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
    messages,
    tools: {
      // add: tool({}),
    },
  });

  return result.toUIMessageStreamResponse();
});

vercelAiSdkRoute.post("/streamObject", cors(), async (c) => {
  const { messages, schema } = await c.req.json();

  const result = streamObject({
    model,
    messages,
    output: "object",
    schema: jsonSchema(schema),
  });

  const stream = partialObjectStreamToUIMessageStream(result.fullStream);

  return createUIMessageStreamResponse({ stream });
});

vercelAiSdkRoute.post("/generateObject", cors(), async (c) => {
  const { messages, schema } = await c.req.json();

  const result = await generateObject({
    model,
    messages,
    output: "object",
    schema: jsonSchema(schema),
  });

  const stream = objectToUIMessageStream(result.object);

  return createUIMessageStreamResponse({ stream });
});
