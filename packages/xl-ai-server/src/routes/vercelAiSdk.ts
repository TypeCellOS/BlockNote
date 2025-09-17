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
  streamText,
  tool,
} from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const vercelAiSdkRoute = new Hono();

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

vercelAiSdkRoute.post("/generateText", cors(), async () => {
  // can't easily convert generateText response to stream
  // https://github.com/vercel/ai/issues/8380
  throw new Error("not implemented");
  // const { messages } = await c.req.json();

  // const result = generateText({
  //   model,
  //   messages: convertToModelMessages(messages),
  //   tools: {
  //     // add: tool({}),
  //   },
  // });

  // return result as any;
  // return result.toDataStreamResponse();
});

vercelAiSdkRoute.post("/streamText", cors(), async (c) => {
  const { messages, streamTools } = await c.req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools: {
      operations: tool({
        name: "operations",
        inputSchema: jsonSchema(streamTools),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
});

vercelAiSdkRoute.post("/streamObject", cors(), async (c) => {
  const { messages, streamTools } = await c.req.json();
  const schema = jsonSchema(streamTools);
  const result = streamObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = partialObjectStreamAsToolCallInUIMessageStream(
    result.fullStream,
    "operations",
  );

  return createUIMessageStreamResponse({ stream });
});

vercelAiSdkRoute.post("/generateObject", cors(), async (c) => {
  const { messages, streamTools } = await c.req.json();
  const schema = jsonSchema(streamTools);

  const result = await generateObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = objectAsToolCallInUIMessageStream(result.object, "operations");

  return createUIMessageStreamResponse({ stream });
});
