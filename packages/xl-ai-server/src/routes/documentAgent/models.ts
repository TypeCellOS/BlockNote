import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import type {
  DocumentAgentOptions,
  LanguageModelObject,
} from "@blocknote/xl-ai/server";

/** The model of the document agent, if `DOCUMENT_AGENT_MODEL` is not set. */
const DEFAULT_MODEL = "anthropic:claude-haiku-5-5";

/**
 * The model of the document agent: `provider:model`, from the environment
 * variable `DOCUMENT_AGENT_MODEL`. The API key of the provider comes from
 * `<PROVIDER>_API_KEY`. The server selects the model: a client cannot.
 */
export function documentAgentModel():
  | { error?: undefined; model: LanguageModelObject; name: string }
  | { error: "unknown-provider" | "no-api-key"; name: string } {
  const name = process.env.DOCUMENT_AGENT_MODEL ?? DEFAULT_MODEL;
  const separator = name.indexOf(":");
  const provider = name.slice(0, separator);
  const modelId = name.slice(separator + 1);
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (apiKey === undefined || apiKey === "") {
    return { error: "no-api-key", name };
  }
  switch (provider) {
    case "anthropic":
      return { model: createAnthropic({ apiKey })(modelId), name };
    case "openai":
      return { model: createOpenAI({ apiKey })(modelId), name };
    case "groq":
      return { model: createGroq({ apiKey })(modelId), name };
    case "google":
      return { model: createGoogle({ apiKey })(modelId), name };
    case "mistral":
      return { model: createMistral({ apiKey })(modelId), name };
    default:
      return { error: "unknown-provider", name };
  }
}

/**
 * The reasoning setting of the document agent, from the environment
 * variable `DOCUMENT_AGENT_REASONING` (for example `none` or `low`). Less
 * reasoning gives the first edit of a run earlier. Without the variable,
 * the provider decides.
 */
export function documentAgentReasoning(): DocumentAgentOptions["reasoning"] {
  const value = process.env.DOCUMENT_AGENT_REASONING;
  return value === undefined || value === ""
    ? undefined
    : (value as DocumentAgentOptions["reasoning"]);
}
