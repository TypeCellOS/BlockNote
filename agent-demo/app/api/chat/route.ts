import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
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
    model: openai("gpt-5-nano"),
    messages: convertToModelMessages(messages),
    tools: {
      ...(frontendTools(tools) as any),
      web_search: openai.tools.webSearch({}),
    },
  });

  return result.toUIMessageStreamResponse();
}
