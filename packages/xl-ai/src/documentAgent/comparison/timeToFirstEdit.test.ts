import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { UIMessage } from "ai";
import { writeFileSync } from "node:fs";
import { afterAll, describe, it } from "vite-plus/test";

import { streamDocumentAgent } from "../agent/documentAgent.js";
import { DOCUMENT_BATCHES_CHUNK } from "../agent/earlyToolCalls.js";
import { createProposal, headlessEditorFactory } from "../proposal/proposal.js";
import { documentOf } from "../testUtil.js";

// A measurement of the time to the first edit, with a real model: the time
// from the request of a user to the first change in the editor.
//
// The normal test run skips this file: it makes LLM calls. Run it with
//   DOCUMENT_AGENT_LIVE=1 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 \
//   vp test --run src/documentAgent/comparison/timeToFirstEdit.test.ts
// and the API key of the provider in the environment. The results go to the
// file in DOCUMENT_AGENT_RESULTS (JSON), if it is set.
//
// Each run gives two times for the first edit:
// - `firstEdit`: the data chunk of the first tool call (the early start).
//   The editor shows the change at this time.
// - `firstToolOutput`: the first tool output of the AI SDK. Without the
//   early start, the editor shows the change only at this time, because the
//   AI SDK runs the tools at the end of the LLM step.

const live = process.env.DOCUMENT_AGENT_LIVE === "1";
const modelName =
  process.env.DOCUMENT_AGENT_MODEL ?? "anthropic:claude-haiku-5-5";
const RUNS = Number(process.env.DOCUMENT_AGENT_RUNS ?? 3);

const PROMPTS = [
  "Fix the spelling mistakes.",
  "Improve the writing of the whole document.",
];

/** The document of the example `09-document-agent`. */
function exampleDocument() {
  return documentOf([
    { type: "heading", props: { level: 1 }, content: "Open source sofware" },
    {
      type: "paragraph",
      content:
        "Open source software refers to computer programms whose source code is made availble to the public, allowing anyone to view, modify, and distribute the code.",
    },
    {
      type: "paragraph",
      content:
        "This model stands in contrast to proprietary software, where the source code is kept secret and only the original creators have the right to make changes.",
    },
    { type: "heading", props: { level: 2 }, content: "Benefits" },
    { type: "bulletListItem", content: "Users control their own technology." },
    {
      type: "bulletListItem",
      content: "Anyone can inspect the code for security problems.",
    },
    {
      type: "paragraph",
      content:
        "Open development also helps innovation: developers build on existing projects and share improvements.",
    },
  ]);
}

function createModel() {
  const separator = modelName.indexOf(":");
  const provider = modelName.slice(0, separator);
  const modelId = modelName.slice(separator + 1);
  return provider === "openai"
    ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId)
    : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelId);
}

type Timing = {
  prompt: string;
  /** Milliseconds from the request to the first change in the editor. */
  firstEdit: number | undefined;
  /** Milliseconds to the first tool output of the AI SDK. */
  firstToolOutput: number | undefined;
  /** Milliseconds to the last change in the editor. */
  lastEdit: number | undefined;
  /** Milliseconds to the end of the run, with the answer of the agent. */
  end: number;
  llmCalls: number;
  toolCalls: number;
  batches: number;
};

const timings: Timing[] = [];
const createEditor = headlessEditorFactory();

async function measure(prompt: string): Promise<Timing> {
  const message: UIMessage = {
    id: "m1",
    role: "user",
    parts: [{ type: "text", text: prompt }],
  };
  const start = performance.now();
  const stream = await streamDocumentAgent(
    { messages: [message], proposal: createProposal(exampleDocument()) },
    { model: createModel(), createEditor },
  );
  const timing: Timing = {
    prompt,
    firstEdit: undefined,
    firstToolOutput: undefined,
    lastEdit: undefined,
    end: 0,
    llmCalls: 0,
    toolCalls: 0,
    batches: 0,
  };
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const now = Math.round(performance.now() - start);
    if (value.type === DOCUMENT_BATCHES_CHUNK) {
      timing.firstEdit ??= now;
      timing.lastEdit = now;
      timing.batches++;
    } else if (value.type === "tool-output-available") {
      timing.firstToolOutput ??= now;
      timing.toolCalls++;
    } else if (value.type === "start-step") {
      timing.llmCalls++;
    }
  }
  timing.end = Math.round(performance.now() - start);
  return timing;
}

describe.skipIf(!live)(`the time to the first edit (${modelName})`, () => {
  afterAll(() => {
    if (process.env.DOCUMENT_AGENT_RESULTS !== undefined) {
      writeFileSync(
        process.env.DOCUMENT_AGENT_RESULTS,
        JSON.stringify({ model: modelName, timings }, undefined, 2),
      );
    }
  });

  for (const prompt of PROMPTS) {
    for (let run = 1; run <= RUNS; run++) {
      it(`${prompt} (run ${run})`, { timeout: 120_000 }, async () => {
        timings.push(await measure(prompt));
      });
    }
  }
});
