import { type BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";

import {
  type BlockOperation,
  type ChangeWarning,
  computeOperations,
} from "@blocknote/xl-ai/text-lens";
import type { CreateEditor } from "./proposal.js";
import { acceptAllChange } from "./review.js";
import type { Proposal } from "./types.js";

/** What a user did with a tool call in the review. */
export type ToolCallState = "open" | "accepted" | "rejected";

/** One editing tool call of a proposal, for the review. */
export type ToolCallInfo = {
  toolCallId: string;
  /** The reason that the agent gave for the changes of this call. */
  reason: string;
  /** The batch of the call. */
  seq: number;
  state: ToolCallState;
  /** The blocks that the call changed, added or removed. */
  changedBlockIds: string[];
};

/** The editing tool calls of a proposal, in sequence, with their review state. */
export function toolCallsOf(proposal: Proposal): ToolCallInfo[] {
  const calls = new Map<string, ToolCallInfo>();
  for (const { seq, source, changedBlockIds } of proposal.batches) {
    switch (source.type) {
      case "tool-call":
        calls.set(source.toolCallId, {
          toolCallId: source.toolCallId,
          reason: source.reason,
          seq,
          state: "open",
          changedBlockIds,
        });
        break;
      case "revert":
      case "accept": {
        const call = calls.get(source.toolCallId);
        if (call !== undefined) {
          call.state = source.type === "revert" ? "rejected" : "accepted";
        }
        break;
      }
      case "rebase":
        break;
      default:
        throw new UnreachableCaseError(source);
    }
  }
  return [...calls.values()];
}

/**
 * The open tool calls that changed each block, in sequence. A block with
 * more than one tool call is the edge case of the display: a suggestion
 * has one ID, thus the display shows the block as a change of the last call.
 */
export function toolCallsOfBlocks(proposal: Proposal): Map<string, string[]> {
  const byBlock = new Map<string, string[]>();
  for (const call of toolCallsOf(proposal)) {
    if (call.state !== "open") {
      continue;
    }
    for (const id of call.changedBlockIds) {
      byBlock.set(id, [...(byBlock.get(id) ?? []), call.toolCallId]);
    }
  }
  return byBlock;
}

/** The changes that a proposal makes to the current main document, for the display. */
export type DerivedSuggestions = {
  /** The operations that change the main document as the proposal asks for it. */
  operations: BlockOperation[];
  /**
   * The tool call of each operation (the same index): the last open call
   * that changed the block of the operation. `undefined` if no open tool
   * call changed that block.
   */
  toolCallIds: (string | undefined)[];
  /**
   * The suggestion ID of each operation (the same index), for the marks of
   * the display: the batch number of its tool call (see
   * {@link suggestionIdOf}), or `UNATTRIBUTED_SUGGESTION`.
   */
  suggestionIds: number[];
  warnings: ChangeWarning[];
};

/** The suggestion ID of a change that no open tool call explains. */
export const UNATTRIBUTED_SUGGESTION = 0;

/**
 * The ID of the suggestion marks of a tool call: the number of its batch.
 * The suggestion marks of `AIExtension` allow only a number as their ID.
 * Thus, the ID is not the tool call ID itself. A proposal has one batch for
 * each tool call, thus the number identifies the call.
 */
export function suggestionIdOf(call: Pick<ToolCallInfo, "seq">): number {
  return call.seq;
}

/**
 * Derives what the proposal changes in the main document, as it is now.
 * This is the write that an accept of the full proposal makes (see
 * `acceptAllChange`). Thus, the display shows what an accept does.
 *
 * `editor` has the current main document, without suggestion marks.
 * Nothing changes.
 */
export function deriveSuggestions(
  editor: BlockNoteEditor<any, any, any>,
  createEditor: CreateEditor,
  proposal: Proposal,
): DerivedSuggestions {
  const result = computeOperations(
    editor,
    acceptAllChange(createEditor, proposal),
  );
  if (result.error !== undefined) {
    // The proposal document comes from an editor with the same schema.
    throw new Error(`The proposal does not fit the document: ${result.error}`);
  }
  const byBlock = toolCallsOfBlocks(proposal);
  const calls = new Map(
    toolCallsOf(proposal).map((call) => [call.toolCallId, call]),
  );
  const toolCallIds = result.operations.map((operation) =>
    byBlock.get(blockOf(operation))?.at(-1),
  );
  return {
    operations: result.operations,
    toolCallIds,
    suggestionIds: toolCallIds.map((toolCallId) => {
      const call = toolCallId === undefined ? undefined : calls.get(toolCallId);
      return call === undefined
        ? UNATTRIBUTED_SUGGESTION
        : suggestionIdOf(call);
    }),
    warnings: result.warnings,
  };
}

/** The block that an operation changes, adds, moves or removes. */
export function blockOf(operation: BlockOperation): string {
  return operation.type === "insert" ? operation.block.id : operation.id;
}
