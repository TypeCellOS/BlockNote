import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createBlockNoteAIClient } from "../../blocknoteAIClient/client.js";

// Create client and models outside of test suites so they can be shared
const client = createBlockNoteAIClient({
  baseURL: "https://localhost:3000/ai",
  apiKey: "PLACEHOLDER",
});

const groq = createGroq({
  ...client.getProviderSettings("groq"),
})("llama-3.3-70b-versatile");

const openai = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4o-2024-08-06", {});

const albert = createOpenAICompatible({
  name: "albert-etalab",
  // albert-etalab/neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8
  baseURL: "https://albert.api.etalab.gouv.fr/v1",
  ...client.getProviderSettings("albert-etalab"),
})("neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8");

export const testAIModels = {
  groq,
  openai,
  albert,
};
