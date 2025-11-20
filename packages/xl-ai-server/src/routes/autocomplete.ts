import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { Hono } from "hono";

export const autocompleteRoute = new Hono();

// Setup your model
// const model = createOpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })("gpt-4.1-nano");

const model = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})("openai/gpt-oss-20b");

// Use `streamText` to stream text responses from the LLM
autocompleteRoute.post("/generateText", async (c) => {
  const { text } = await c.req.json();

  const result = await generateText({
    model,
    system: `You are a writing assistant. Predict and generate the most likely next part of the text.
- separate suggestions by newlines
- max 3 suggestions
- keep it short, max 5 words per suggestion
- don't include other text (or explanations)
- YOU MUST ONLY return the text to be appended. Your suggestion will EXACTLY replace [SUGGESTION_HERE].
- YOU MUST NOT include the original text / characters (prefix) in your suggestion.
- YOU MUST add a space (or other relevant punctuation) before the suggestion IF starting a new word (the suggestion will be directly concatenated to the text)`,
    messages: [
      {
        role: "user",
        content: `Complete the following text: 
        ${text}[SUGGESTION_HERE]`,
      },
    ],
    abortSignal: c.req.raw.signal,
  });

  return c.json({
    suggestions: result.text
      .split("\n")
      .map((suggestion) => suggestion.trimEnd())
      .filter((suggestion) => suggestion.trim().length > 0),
  });
});
