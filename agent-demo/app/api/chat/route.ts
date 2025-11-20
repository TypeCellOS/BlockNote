import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
} from "@blocknote/xl-ai/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { JSONSchema7 } from "json-schema";

export async function POST(req: Request) {
  const {
    messages,
    tools,
  }: {
    messages: UIMessage[];
    tools: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();
  const result = streamText({
    system: aiDocumentFormats.html.systemPrompt,
    model: openai("gpt-4o-2024-08-06"), // openai("gpt-5-nano"),
    messages: convertToModelMessages(injectDocumentStateMessages(messages)),
    tools: {
      ...(frontendTools(tools) as any), // TODO: tools vs toolDefinitions
      web_search: openai.tools.webSearch({}),
    },
    // providerOptions: {
    //   openai: {
    //     reasoningEffort: "low",
    //   },
    // },
    // toolChoice: "required", // TODO: make configurable from client?
  });

  return result.toUIMessageStreamResponse();
}

//  - the "getDocument" tool shows the document as an array of html blocks (the cursor is BETWEEN two blocks as indicated by cursor: true).
//  - the "getDocumentSelection" tool shows the current user selection, if any.
//  - when the document is empty, prefer updating the empty block before adding new blocks. Otherwise, prefer updating existing blocks over removing and adding (but this also depends on the user's question).
//   Don't call "getDocument" or "getDocumentSelection" tools directly, the information is already available.
//  When there is a selection, issue operations against the result of "getDocumentSelection". You can still use the result of "getDocument" (which includes the selection as well) to understand the context.
