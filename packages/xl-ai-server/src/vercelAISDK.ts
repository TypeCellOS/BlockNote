import { openai } from "@ai-sdk/openai";
import { streamObject, streamText, tool } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const vercelAiSdkRoute = new Hono();

vercelAiSdkRoute.post("/streamText", cors(), async (c) => {
  const { messages } = await c.req.json();

  const result = streamText({
    model: openai("gpt-4-turbo"),
    system: "You are a helpful assistant.",
    messages,
    toolCallStreaming: true,
    tools: {
      add: tool({}),
    },
  });

  return result.toDataStreamResponse();
});

vercelAiSdkRoute.post("/streamObject", cors(), async (c) => {
  const { messages } = await c.req.json();

  const result = streamObject({
    model: openai("gpt-4-turbo"),
    system: "You are a helpful assistant.",
    messages,

    tools: {
      add: tool({}),
    },
  });

  return result.toDataStreamResponse();
});
