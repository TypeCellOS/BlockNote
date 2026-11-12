import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { type LensBlock, markdownFormat } from "@blocknote/xl-ai/text-lens";
import {
  type CreateEditor,
  openProposal,
  withBatch,
  writeBatch,
} from "./proposal/proposal.js";
import type { BatchSource, Proposal } from "./proposal/types.js";

/** A small document for the tests: a heading and two paragraphs, with fixed IDs. */
export function initialDocument(): LensBlock[] {
  return documentOf([
    { id: "title", type: "heading", content: "Title" },
    { id: "p1", type: "paragraph", content: "First paragraph." },
    { id: "p2", type: "paragraph", content: "Second paragraph." },
  ]);
}

/** The blocks as an editor stores them, with all their fields. */
export function documentOf(blocks: PartialBlock[]): LensBlock[] {
  return BlockNoteEditor.create({
    initialContent: blocks,
    trailingBlock: false,
  }).document;
}

/** The source of a batch of a tool call, with a reason that names the call. */
export function toolCall(toolCallId: string): BatchSource {
  return { type: "tool-call", toolCallId, reason: `Reason of ${toolCallId}` };
}

/** Fails the test if the result is an error, and narrows it to the success case. */
export function valid<T extends { error?: string }>(
  result: T,
): Extract<T, { error?: undefined }> {
  if (result.error !== undefined) {
    throw new Error(`Unexpected error: ${result.error}`);
  }
  return result as Extract<T, { error?: undefined }>;
}

/** The plain text of a block with inline content. */
export function textOf(block: { content?: unknown } | undefined): string {
  const content = block?.content;
  if (!Array.isArray(content)) {
    return "";
  }
  return content.map((item: { text?: string }) => item.text ?? "").join("");
}

/** The plain text of each top-level block of a document. */
export function textsOf(blocks: readonly LensBlock[]): string[] {
  return blocks.map((block) => textOf(block));
}

/**
 * Writes a markdown text to the proposal, as one tool call with the ID
 * `toolCallId`. The text replaces the proposal document.
 */
export function writeMarkdown(
  createEditor: CreateEditor,
  proposal: Proposal,
  text: string,
  toolCallId: string,
): Proposal {
  const { editor } = openProposal(createEditor, proposal);
  const result = writeBatch(
    createEditor,
    editor,
    { format: markdownFormat, text, base: "current" },
    proposal.batches.length + 1,
    toolCall(toolCallId),
  );
  if (result.error !== undefined || result.batch === undefined) {
    throw new Error("The write gave no batch");
  }
  return withBatch(proposal, result.batch);
}

/** The prompt of one LLM call: the messages that the model gets. */
export type LanguageModelV4Prompt = Parameters<
  MockLanguageModelV4["doGenerate"]
>[0]["prompt"];

/** One part of the stream of a model. */
type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer Part>
    ? Part
    : never;

/** One scripted step of the mock model: tool calls, or the final text. */
export type ScriptedStep =
  | { toolCalls: { toolName: string; input: unknown }[] }
  | { text: string };

/**
 * A mock model that plays a script: step `n` of the script answers LLM call
 * `n`. A step can be a function of the prompt of that call. Thus, a test
 * can use the result of an earlier tool call (for example the version).
 * `prompts` has the prompt of each call: the messages that the model got.
 *
 * With `beforeToolCall`, the stream of the model waits for the promise
 * before it writes that tool call. Thus, a test can examine what occurs
 * while the model still writes an LLM step.
 */
export function scriptedModel(
  script: (ScriptedStep | ((prompt: LanguageModelV4Prompt) => ScriptedStep))[],
  options: { beforeToolCall?: (toolCallId: string) => Promise<void> } = {},
) {
  const prompts: LanguageModelV4Prompt[] = [];
  let toolCalls = 0;

  function next(prompt: LanguageModelV4Prompt): ScriptedStep {
    const step = script[prompts.length];
    prompts.push(prompt);
    if (step === undefined) {
      throw new Error(`The script has no step ${prompts.length}`);
    }
    return typeof step === "function" ? step(prompt) : step;
  }

  function contentOf(step: ScriptedStep) {
    return "text" in step
      ? [{ type: "text" as const, text: step.text }]
      : step.toolCalls.map(({ toolName, input }) => ({
          type: "tool-call" as const,
          toolCallId: `call-${++toolCalls}`,
          toolName,
          input: JSON.stringify(input),
        }));
  }

  function finishOf(step: ScriptedStep) {
    return {
      finishReason: {
        unified: "text" in step ? ("stop" as const) : ("tool-calls" as const),
        raw: undefined,
      },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 5, text: 5, reasoning: undefined },
      },
    };
  }

  const model = new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      const step = next(prompt);
      return { content: contentOf(step), ...finishOf(step), warnings: [] };
    },
    doStream: async ({ prompt }) => {
      const step = next(prompt);
      const chunks: StreamPart[] = [];
      for (const part of contentOf(step)) {
        if (part.type === "text") {
          chunks.push(
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: part.text },
            { type: "text-end", id: "text-1" },
          );
        } else {
          chunks.push(part);
        }
      }
      chunks.push({ type: "finish", ...finishOf(step) });
      const { beforeToolCall } = options;
      if (beforeToolCall === undefined) {
        return { stream: simulateReadableStream({ chunks }) };
      }
      return {
        stream: new ReadableStream<StreamPart>({
          async start(controller) {
            for (const chunk of chunks) {
              if (chunk.type === "tool-call") {
                await beforeToolCall(chunk.toolCallId);
              }
              controller.enqueue(chunk);
            }
            controller.close();
          },
        }),
      };
    },
  });
  return { model, prompts };
}

/** The text of the last tool result in a prompt of the mock model. */
export function lastToolResult(prompt: LanguageModelV4Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role === "tool") {
      const part = message.content.at(-1);
      if (part?.type === "tool-result" && part.output.type === "text") {
        return part.output.value;
      }
    }
  }
  throw new Error("The prompt has no tool result with text");
}

/** The version in the text of a tool result (for example "Version: v2"). */
export function versionIn(text: string): string {
  const match = /\bv\d+\b/.exec(text);
  if (match === null) {
    throw new Error(`No version in: ${text}`);
  }
  return match[0];
}
