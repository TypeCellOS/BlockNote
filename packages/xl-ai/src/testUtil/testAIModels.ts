import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "not-available-in-ci",
})("llama-3.3-70b-versatile");

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "not-available-in-ci",
})("gpt-4o-2024-08-06");

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "not-available-in-ci",
})("claude-haiku-4-5");

const albert = createOpenAICompatible({
  name: "albert-etalab",
  baseURL: "https://albert.api.etalab.gouv.fr/v1",
  apiKey: process.env.ALBERT_API_KEY || "not-available-in-ci",
})("albert-etalab.chat/albert-large");

export const testAIModels: Record<
  "groq" | "openai" | "albert" | "anthropic",
  Exclude<LanguageModel, string>
> = {
  groq,
  openai,
  albert,
  anthropic,
};
