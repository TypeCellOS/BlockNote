import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";

export const modelPlaygroundRoute = new Hono();

/**
 * This endpoint is used in the AI Playground so we can select different models
 * the model string (e.g. "openai.chat/gpt-4o") is sent in the request body
 * based on which we use the corresponding AI SDK model
 */
modelPlaygroundRoute.post("/streamText", async (c) => {
  const { messages, toolDefinitions, model: modelString } = await c.req.json();

  const model = getModel(modelString);

  if (model === "unknown-model") {
    return c.json({ error: "Unknown model" }, 404);
  }

  const result = streamText({
    model,
    system: aiDocumentFormats.html.systemPrompt,
    messages: await convertToModelMessages(injectDocumentStateMessages(messages)),
    tools: toolDefinitionsToToolSet(toolDefinitions),
    toolChoice: "required",
  });

  return result.toUIMessageStreamResponse();
});

function getProviderKey(provider: string) {
  const beforeDot = provider.split(".")[0];
  const envKey = `${beforeDot.toUpperCase().replace(/-/g, "_")}_API_KEY`;
  const key = process.env[envKey];
  if (!key || !key.length) {
    return "not-found";
  }
  return key;
}

// return the AI SDK model based on the selected model string
function getModel(aiModelString: string) {
  const [provider, ...modelNameParts] = aiModelString.split("/");
  const modelName = modelNameParts.join("/");

  const providerKey = getProviderKey(provider);
  if (providerKey === "not-found") {
    return "unknown-model" as const;
  }

  if (provider === "openai.chat") {
    return createOpenAI({
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "groq.chat") {
    return createGroq({
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "albert-etalab.chat") {
    return createOpenAICompatible({
      name: "albert-etalab",
      baseURL: "https://albert.api.etalab.gouv.fr/v1",
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "eurouter.chat") {
    return createOpenAICompatible({
      name: "eurouter",
      baseURL: "https://eurouter.ai/api/v1",
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "mistral.chat") {
    return createMistral({
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "anthropic.chat") {
    return createAnthropic({
      apiKey: providerKey,
    })(modelName);
  } else if (provider === "google.generative-ai") {
    return createGoogleGenerativeAI({
      apiKey: providerKey,
    })(modelName);
  } else {
    return "unknown-model" as const;
  }
}
