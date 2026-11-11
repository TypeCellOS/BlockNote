import type { BlockNoteEditor } from "@blocknote/core";

import {
  type ChangeWarning,
  type DocumentChange,
  getDocumentText,
  type LensBlock,
  markdownFormat,
  type MergeWarning,
} from "../../api/v2/index.js";
import { openProposal, writeBatch } from "../proposal/proposal.js";
import type { Batch, Proposal } from "../proposal/types.js";
import type { DocumentHandle } from "./handle.js";

/**
 * A note for the agent on a tool call: a part of its changes did not apply
 * as written. `text` is the start of the text of the block, because the
 * agent reads markdown and does not know the block IDs.
 */
export type ToolNote =
  /** A warning of the lens for the write of this tool call. */
  | { type: "warning"; warning: ChangeWarning; text: string | undefined }
  /**
   * A change of an earlier tool call that a rebase dropped: a user changed
   * the same part of the main document, or removed the block.
   */
  | { type: "dropped"; warning: MergeWarning; text: string | undefined }
  /** The users changed the main document after the last tool call. */
  | { type: "main-changed" };

/**
 * The part of each tool output for a client that follows the run: the
 * batches that the tool call added to the proposal. The model does not get
 * them (see `describe.ts`).
 */
type Followable = { batches: Batch[] };

/** The decision of a user on the change of one tool call. */
export type ToolCallReview = "accepted" | "rejected";

/** The output of `readDocument`. */
export type ReadOutput = Followable & {
  markdown: string;
  /** The version of the proposal document that the markdown shows. */
  version: string;
  notes: ToolNote[];
};

/** The output of `writeDocument`. An expected failure is a value, and the proposal does not change. */
export type WriteOutput = Followable &
  (
    | {
        error?: undefined;
        /** The version of the proposal document after the write. */
        version: string;
        /** False if the document already agreed with the text. */
        changed: boolean;
        notes: ToolNote[];
        /**
         * The decision of a user on the change of this tool call. A tool
         * does not set it: the review of a user adds it to the output in
         * the chat (see `recordReview`).
         */
        review?: ToolCallReview;
      }
    /** A user changed the same part of the document after `base`. The agent must read again. */
    | { error: "conflict"; conflicts: ToolNote[] }
    /** The markdown gives blocks that the schema does not allow. */
    | { error: "invalid-document" }
    /** `base` is not a version of this document. */
    | { error: "unknown-version" }
    /** A field of the input of the tool call is missing, or is not a string. */
    | { error: "invalid-input"; field: string }
  );

/** The output of `editText`. */
export type EditOutput =
  | WriteOutput
  /** The document does not contain `old`. */
  | (Followable & { error: "not-found" })
  /** The document contains `old` more than one time. */
  | (Followable & { error: "not-unique"; count: number });

export type WriteInput = {
  /** The full document, as markdown. */
  markdown: string;
  /** The version that the agent read (from `readDocument` or from its last write). */
  base: string;
  /** Why the agent makes these changes. A user sees it next to the changes. */
  reason: string;
};

export type EditInput = {
  /** The text to replace. It must be in the markdown of the document exactly one time. */
  old: string;
  /** The text that replaces it. */
  new: string;
  /** Why the agent makes this change. A user sees it next to the change. */
  reason: string;
};

/** Reads the document of the agent (the proposal) as markdown, with its version. */
export async function readDocument(
  handle: DocumentHandle,
): Promise<ReadOutput> {
  const { result, batches } = await handle.update((proposal, dropped) => {
    const { editor } = openProposal(handle.createEditor, proposal);
    return {
      batch: undefined,
      result: {
        markdown: getDocumentText(editor, markdownFormat),
        version: versionOf(proposal),
        notes: droppedNotes(dropped, editor.document),
      },
    };
  });
  return { ...result, notes: withMainChanged(result.notes, batches), batches };
}

/**
 * Writes the full document. The lens applies only the changes, with `base`
 * as the version that the agent read. Thus, the changes that other writers
 * made after `base` stay. If such a change is in conflict with the text,
 * nothing applies, and the agent must read again.
 */
export async function writeDocument(
  handle: DocumentHandle,
  input: WriteInput,
  toolCallId: string,
): Promise<WriteOutput> {
  const field = missingField(input, ["markdown", "base", "reason"]);
  if (field !== undefined) {
    return { error: "invalid-input", field, batches: [] };
  }
  const { result, batches } = await handle.update<
    DistributiveOmit<WriteOutput, "batches">
  >((proposal, dropped) => {
    const baseSeq = parseVersion(input.base, proposal);
    if (baseSeq === undefined) {
      return { batch: undefined, result: { error: "unknown-version" } };
    }
    const { editor, versions } = openProposal(handle.createEditor, proposal, [
      baseSeq,
    ]);
    const base = versions.get(baseSeq);
    return writeStep(
      handle,
      proposal,
      editor,
      dropped,
      toolCallId,
      input.reason,
      {
        format: markdownFormat,
        text: input.markdown,
        // The agent read the current version: the text is the truth.
        ...(baseSeq === proposal.batches.length || base === undefined
          ? { base: "current" }
          : { base, onConflict: "reject" }),
      },
    );
  });
  return withBatches(result, batches);
}

/**
 * Replaces one text in the markdown of the document, as the edit tool of a
 * coding agent does it. `old` must be in the markdown exactly one time.
 */
export async function editText(
  handle: DocumentHandle,
  input: EditInput,
  toolCallId: string,
): Promise<EditOutput> {
  const field = missingField(input, ["old", "new", "reason"]);
  if (field !== undefined) {
    return { error: "invalid-input", field, batches: [] };
  }
  const { result, batches } = await handle.update<
    DistributiveOmit<EditOutput, "batches">
  >((proposal, dropped) => {
    const { editor } = openProposal(handle.createEditor, proposal);
    const markdown = getDocumentText(editor, markdownFormat);
    const count = input.old === "" ? 0 : markdown.split(input.old).length - 1;
    if (count === 0) {
      return { batch: undefined, result: { error: "not-found" } };
    }
    if (count > 1) {
      return { batch: undefined, result: { error: "not-unique", count } };
    }
    return writeStep(
      handle,
      proposal,
      editor,
      dropped,
      toolCallId,
      input.reason,
      {
        format: markdownFormat,
        // A function as the replacement: `$` in `new` has no special meaning.
        text: markdown.replace(input.old, () => input.new),
        base: "current",
      },
    );
  });
  return withBatches(result, batches);
}

/**
 * The first field of the input that is not a string, or `undefined`. A model
 * can send an input that does not agree with the schema of the tool. This is
 * an expected failure: the model gets an error value, and corrects its call.
 */
function missingField<Input extends Record<string, unknown>>(
  input: Input,
  fields: readonly (keyof Input & string)[],
): string | undefined {
  return fields.find((field) => typeof input[field] !== "string");
}

/** `Omit` for each member of a union. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** Applies the change of an editing tool call to the proposal document, as one batch. */
function writeStep(
  handle: DocumentHandle,
  proposal: Proposal,
  editor: BlockNoteEditor<any, any, any>,
  dropped: MergeWarning[],
  toolCallId: string,
  reason: string,
  change: DocumentChange,
): {
  batch: Batch | undefined;
  result: DistributiveOmit<WriteOutput, "batches">;
} {
  const before: LensBlock[] = editor.document;
  const written = writeBatch(
    handle.createEditor,
    editor,
    change,
    proposal.batches.length + 1,
    { type: "tool-call", toolCallId, reason },
  );
  if (written.error === "invalid-document") {
    return { batch: undefined, result: { error: "invalid-document" } };
  }
  if (written.error === "conflict") {
    return {
      batch: undefined,
      result: {
        error: "conflict",
        conflicts: written.conflicts.map((warning) => ({
          type: "warning" as const,
          warning,
          text: previewOf(before, warning.id),
        })),
      },
    };
  }
  const after: LensBlock[] = editor.document;
  return {
    batch: written.batch,
    result: {
      version: `v${proposal.batches.length + (written.batch ? 1 : 0)}`,
      changed: written.batch !== undefined,
      notes: [
        ...droppedNotes(dropped, after),
        ...written.warnings.map((warning) => ({
          type: "warning" as const,
          warning,
          text:
            "id" in warning
              ? (previewOf(after, warning.id) ?? previewOf(before, warning.id))
              : warning.text,
        })),
      ],
    },
  };
}

/** The version of the proposal document: the number of its batches. */
function versionOf(proposal: Proposal): string {
  return `v${proposal.batches.length}`;
}

/** The batch number of a version token, or `undefined` if the proposal has no such version. */
function parseVersion(token: string, proposal: Proposal): number | undefined {
  const match = /^v(\d+)$/.exec(token.trim());
  const seq = match === null ? undefined : Number(match[1]);
  return seq !== undefined && seq <= proposal.batches.length ? seq : undefined;
}

function droppedNotes(
  dropped: MergeWarning[],
  document: readonly LensBlock[],
): ToolNote[] {
  return dropped.map((warning) => ({
    type: "dropped",
    warning,
    text: previewOf(document, warning.id),
  }));
}

/** Adds the batches of the step to the result, and a note if a rebase took changes of the users. */
function withBatches<T extends { error?: string; notes?: ToolNote[] }>(
  result: T,
  batches: Batch[],
): T & Followable {
  return {
    ...result,
    ...(result.notes !== undefined && {
      notes: withMainChanged(result.notes, batches),
    }),
    batches,
  };
}

function withMainChanged(notes: ToolNote[], batches: Batch[]): ToolNote[] {
  const mainChanged = batches.some(
    (batch) => batch.source.type === "rebase" && batch.operations.length > 0,
  );
  return mainChanged ? [{ type: "main-changed" }, ...notes] : notes;
}

/** The start of the text of a block, or `undefined` if the document does not have the block. */
function previewOf(
  blocks: readonly LensBlock[],
  id: string,
): string | undefined {
  const stack = [...blocks];
  for (let block = stack.pop(); block !== undefined; block = stack.pop()) {
    if (block.id === id) {
      const text = inlineText(block.content);
      return text.length > 60 ? `${text.slice(0, 60)}…` : text;
    }
    stack.push(...block.children);
  }
  return undefined;
}

/** The plain text of inline content: styled text, links and custom inline content. */
function inlineText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((item: unknown) => {
      if (typeof item !== "object" || item === null) {
        return "";
      }
      if ("text" in item && typeof item.text === "string") {
        return item.text;
      }
      if ("content" in item) {
        return typeof item.content === "string"
          ? item.content
          : inlineText(item.content);
      }
      return "";
    })
    .join("");
}
