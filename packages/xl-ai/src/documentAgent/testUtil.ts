import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";

import { type LensBlock, markdownFormat } from "../api/v2/index.js";
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
