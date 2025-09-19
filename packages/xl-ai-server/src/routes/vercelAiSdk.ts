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

export const vercelAiSdkRoute = new Hono();

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

vercelAiSdkRoute.post("/generateText", async () => {
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

vercelAiSdkRoute.post("/streamText", async (c) => {
  const { messages, streamTools } = await c.req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools: {
      applyDocumentOperations: tool({
        name: "applyDocumentOperations",
        inputSchema: jsonSchema(streamTools),
        outputSchema: jsonSchema({ type: "object" }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
});

vercelAiSdkRoute.post("/streamObject", async (c) => {
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
    "applyDocumentOperations",
  );

  return createUIMessageStreamResponse({ stream });
});

vercelAiSdkRoute.post("/generateObject", async (c) => {
  const { messages, streamTools } = await c.req.json();
  const schema = jsonSchema(streamTools);

  const result = await generateObject({
    model,
    messages: convertToModelMessages(messages),
    output: "object",
    schema,
  });

  const stream = objectAsToolCallInUIMessageStream(
    result.object,
    "applyDocumentOperations",
  );

  return createUIMessageStreamResponse({ stream });
});
