import { createOpenAI } from "@ai-sdk/openai";
import { llmFormats } from "@blocknote/xl-ai";
import {
  convertToModelMessages,
  createIdGenerator,
  isToolOrDynamicToolUIPart,
  jsonSchema,
  streamText,
  tool,
  UIMessage,
  UIMessagePart,
  validateUIMessages,
} from "ai";
import { Hono } from "hono";

export const vercelAiSdkPersistenceRoute = new Hono();

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");

// Stores chats in memory
// for a more realistic pattern,
// see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence#starting-a-new-chat
const messageStorage = new Map<string, UIMessage<any, any, any>[]>();

// stub, usually would do a database call
async function loadChat(id: string) {
  if (!messageStorage.has(id)) {
    messageStorage.set(id, []);
  }
  return [...messageStorage.get(id)!]; // clone
}

// stub, usually would do a database call
async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  messageStorage.set(chatId, messages);
}

// follows this example:
// https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence#sending-only-the-last-message
vercelAiSdkPersistenceRoute.post("/streamText", async (c) => {
  const { id, promptData, streamTools, lastToolParts } = await c.req.json();

  const tools = {
    applyDocumentOperations: tool({
      name: "applyDocumentOperations",
      inputSchema: jsonSchema(streamTools),
      outputSchema: jsonSchema({ type: "object" }),
    }),
  };

  // load the previous messages from the server:
  const messages = await loadChat(id);

  const toolParts = (lastToolParts as any[]).filter((part: any) =>
    isToolOrDynamicToolUIPart(part),
  );

  // get results from tool parts to update the last message
  if (messages.length > 0 && toolParts.length > 0) {
    const lastMessage = messages[messages.length - 1];

    messages[messages.length - 1] = {
      ...lastMessage,
      parts: lastMessage.parts.map((part) => {
        if (isToolOrDynamicToolUIPart(part)) {
          const matchingToolPart = toolParts.find(
            (toolPart) => toolPart.toolCallId === part.toolCallId,
          );
          if (matchingToolPart) {
            return {
              ...part,
              state: matchingToolPart.state,
              output: matchingToolPart.output,
              errorText: matchingToolPart.errorText,
            } as UIMessagePart<any, any>;
          }
        }
        return part;
      }),
    };
  }

  await llmFormats.html.defaultPromptBuilder(messages, promptData);

  // validate messages if they contain tools, metadata, or data parts:
  const validatedMessages = await validateUIMessages({
    messages,
    tools,
  });

  const result = streamText({
    model,
    messages: convertToModelMessages(validatedMessages),
    tools,
  });

  return result.toUIMessageStreamResponse({
    // Generate consistent server-side IDs for persistence:
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    originalMessages: validatedMessages,
    onFinish: ({ messages }) => {
      saveChat({ chatId: id, messages });
    },
  });
});
