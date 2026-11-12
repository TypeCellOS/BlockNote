import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { UIMessage } from "ai";
import { writeFileSync } from "node:fs";
import { afterAll, describe, it } from "vite-plus/test";

import type { DocumentAgentOptions } from "../agent/documentAgent.js";
import {
  DOCUMENT_BATCHES_CHUNK,
  type DocumentBatchesData,
} from "../proposal/chunks.js";
import { createProposal, headlessEditorFactory } from "../proposal/proposal.js";
import { streamDocumentAgent } from "../proposal/streamProposalAgent.js";
import { documentOf } from "../testUtil.js";

// A measurement of the time to the first edit, with a real model: the time
// from the request of a user to the first change in the editor.
//
// The normal test run skips this file: it makes LLM calls. Run it with
//   DOCUMENT_AGENT_LIVE=1 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 \
//   vp test --run src/comparison/timeToFirstEdit.test.ts
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
/** The reasoning setting of the runs, for example `none`. The default is the default of the provider. */
const reasoning = process.env.DOCUMENT_AGENT_REASONING as
  | DocumentAgentOptions["reasoning"]
  | undefined;
/** The tools of the runs (names with `,` between them). The default is all tools. */
const tools = process.env.DOCUMENT_AGENT_TOOLS?.split(",") as
  | DocumentAgentOptions["tools"]
  | undefined;

/**
 * The number of paragraphs of a long document, for a measurement of a
 * large change. Without it, the document is the document of the example.
 */
const LONG = Number(process.env.DOCUMENT_AGENT_PARAGRAPHS ?? 0);

const PROMPTS =
  LONG > 0
    ? [
        "Improve the writing of the whole document.",
        // A change of one part of a long document.
        "Replace the four paragraphs about releases, security problems, the community and money with one short paragraph that summarizes them.",
      ]
    : [
        "Fix the spelling mistakes.",
        "Improve the writing of the whole document.",
      ];

/** Paragraphs on different topics, each with weak writing, for a long document. */
const LONG_PARAGRAPHS = [
  "A license is a thing that says what people are allowed to do with the code, and there is a lot of different licenses, and it is very very important that a project picks one, because without it nobody really knows what they can do.",
  "When somebody makes a copy of a project to change it in their own way this is called a fork, and forks can be good or bad depending on the situation, but mostly they are a normal part of how things are done in open source.",
  "Maintainers are the people which look after a project, they read the changes that other people send and they decide what goes in, and this work is often not paid and takes a really big amount of time every single week.",
  "An issue tracker is where the bugs get written down by users, and it is used also for ideas for new features, and if it is not kept clean it becomes quickly a big mess that nobody wants to read anymore.",
  "Tests are run automatically on every change in most of the projects nowadays, which is called continuous integration, and it helps to find the problems early before they are getting into a release that people use.",
  "Documentation is the part that many projects do badly, because writing it is seen as boring, but for new users it is in fact the first thing they see and it decides often if they stay or if they go away.",
  "A release is when a new version is given to the users, and it should have a number and a list of what changed, and doing releases in a regular way makes that people trust the project more than when releases are random.",
  "Security problems must be handled with care, usually they are reported in private first so that a fix can be made, and only after the fix is out the details are told to everybody, which protects the users.",
  "The community of a project is all the people around it, the users and the contributors and the maintainers, and a community that is friendly to new people grows much more faster than one that is not.",
  "Money is a hard topic in open source, since most of the code is given away for free, and so projects are trying donations, sponsors, paid support or paid hosting to pay the people that do the work.",
  "Governance means the rules about who decides, some projects have one leader who decides everything and other ones have a committee that votes, and both ways can work if the rules are clear to everybody.",
  "Packaging is how the software gets to the computers of the users, through package managers mostly, and when the packaging is done wrong the users get old versions or broken installs and they blame the project.",
  "A code review is when another person reads a change before it is accepted, it finds mistakes and it also spreads the knowledge about the code, although it can be slow when there is too few reviewers.",
  "Backwards compatibility means that a new version does not break the things that worked with the old version, and keeping it costs effort, but breaking it too often makes the users angry and they leave.",
  "A roadmap is a plan of what the project wants to do in the next time, it does not have to be exact, but having one helps the contributors to know where their help is needed the most.",
  "Translations make that a project can be used by people who do not speak english, they are done often by volunteers, and they need to be updated every time when the texts in the software are changing.",
];

/** A document of `count` different paragraphs of about 40 words. */
function longDocument(count: number) {
  return documentOf(
    LONG_PARAGRAPHS.slice(0, count).map((content) => ({
      type: "paragraph" as const,
      content,
    })),
  );
}

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
  /** The name of each tool call, in sequence. */
  tools: string[];
  /** The number of blocks that the batches changed. */
  changedBlocks: number;
  /** The start of the answer of the agent. */
  answer: string;
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
    {
      messages: [message],
      proposal: createProposal(
        LONG > 0 ? longDocument(LONG) : exampleDocument(),
      ),
    },
    {
      model: createModel(),
      createEditor,
      reasoning,
      tools,
      maxOutputTokens: 16000,
    },
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
    tools: [],
    changedBlocks: 0,
    answer: "",
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
      const { batches } = value.data as DocumentBatchesData;
      timing.changedBlocks += new Set(
        batches.flatMap((batch) => batch.changedBlockIds),
      ).size;
    } else if (value.type === "tool-input-available") {
      timing.tools.push(value.toolName);
    } else if (value.type === "text-delta" && timing.answer.length < 200) {
      timing.answer += value.delta;
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
        JSON.stringify({ model: modelName, reasoning, timings }, undefined, 2),
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
