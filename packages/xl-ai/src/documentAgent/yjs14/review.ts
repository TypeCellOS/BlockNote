import * as Y from "@y/y";

import type { AgentToolCall } from "../tools/agentDocument.js";
import type { ToolCallReview } from "../tools/documentTools.js";
import {
  TOOL_CALLS_TYPE,
  type ToolCallIds,
  type ToolCallRecord,
  toolCallRecordsOf,
  writeDecision,
} from "./toolCallRecords.js";

/** A tool call of an agent in a review, with the decision of a user. */
export type ReviewedToolCall = AgentToolCall & {
  state: "open" | ToolCallReview;
};

/** The result of a decision of a user for one tool call. */
export type DecisionResult =
  | { error?: undefined }
  | { error: "unknown-tool-call" }
  /** A user already accepted or rejected the tool call. */
  | { error: "decided" };

/**
 * The review of the changes of an agent in Yjs 14 mode, for one replica of
 * the main document (M) and of the suggestion document (S). It works on
 * the two Y.Docs, without an editor.
 *
 * The suggestion layer of Yjs 14 accepts and rejects a position range: the
 * full run of adjacent suggestions around that range, also of a different
 * tool call. Thus, this review uses the Yjs items of each tool call (see
 * `toolCallRecords.ts`):
 *
 * - An accept applies the part of S with the items of the tool call to M.
 *   Two users who accept the same tool call apply the same items: the
 *   accept is idempotent.
 * - A reject undoes the items of the tool call in S, and applies the
 *   result to M. Yjs cannot put back a deleted item: the undo of a
 *   suggested deletion inserts a copy of the text. Thus, two users who
 *   reject the same deletion at the same time insert two copies. The copy
 *   comes from the text of the deleted item in S: each replica of S must
 *   keep it (`gc: false`). A reject throws if this replica does not have
 *   the text.
 */
export type SuggestionReview = {
  /** The tool calls of the agent, in the sequence of the calls. */
  toolCalls(): ReviewedToolCall[];
  acceptToolCall(toolCallId: string): DecisionResult;
  rejectToolCall(toolCallId: string): DecisionResult;
  /** Accepts each tool call without a decision. */
  acceptAll(): void;
  /** Rejects each tool call without a decision. */
  rejectAll(): void;
  /** Calls the listener after each change of the tool calls or of their decisions. */
  subscribe(listener: () => void): () => void;
};

export function createSuggestionReview(options: {
  main: Y.Doc;
  suggestion: Y.Doc;
}): SuggestionReview {
  const { main, suggestion } = options;

  function openRecord(
    toolCallId: string,
  ):
    | { error?: undefined; record: ToolCallRecord }
    | Exclude<DecisionResult, { error?: undefined }> {
    const record = toolCallRecordsOf(suggestion).find(
      (item) => item.toolCallId === toolCallId,
    );
    if (record === undefined) {
      return { error: "unknown-tool-call" };
    }
    return record.decision === undefined ? { record } : { error: "decided" };
  }

  function accept(record: ToolCallRecord) {
    applyToMain(main, suggestion, record.ids);
    writeDecision(suggestion, record.toolCallId, "accepted");
  }

  function reject(record: ToolCallRecord) {
    if (!hasContentOf(suggestion, record.ids.deletes)) {
      // The undo cannot put back a text that the suggestion document does
      // not have: the reject would remove that text from the main document.
      throw new Error(
        "A reject needs the text of each suggested deletion in the suggestion document. This replica does not have it: it collects garbage, or its state comes from a replica that collects garbage. Use `gc: false` for each replica of a suggestion document.",
      );
    }
    const undone: ToolCallIds = {
      inserts: Y.createIdSet(),
      deletes: Y.createIdSet(),
    };
    function collect(transaction: Y.Transaction) {
      Y.insertIntoIdSet(undone.inserts, transaction.insertSet);
      Y.insertIntoIdSet(undone.deletes, transaction.deleteSet);
    }
    suggestion.on("afterTransaction", collect);
    try {
      Y.undoContentIds(suggestion, record.ids);
    } finally {
      suggestion.off("afterTransaction", collect);
    }
    // The main document gets the items of the tool call and their undo.
    // After that, the two documents agree on these items: nothing of the
    // tool call is a suggestion.
    applyToMain(main, suggestion, {
      inserts: Y.mergeIdSets([record.ids.inserts, undone.inserts]),
      deletes: Y.mergeIdSets([record.ids.deletes, undone.deletes]),
    });
    writeDecision(suggestion, record.toolCallId, "rejected");
  }

  function openRecords(): ToolCallRecord[] {
    return toolCallRecordsOf(suggestion).filter(
      (record) => record.decision === undefined,
    );
  }

  return {
    toolCalls() {
      return toolCallRecordsOf(suggestion).map((record) => ({
        toolCallId: record.toolCallId,
        reason: record.reason,
        state: record.decision ?? "open",
      }));
    },
    acceptToolCall(toolCallId) {
      const found = openRecord(toolCallId);
      if (found.error !== undefined) {
        return found;
      }
      accept(found.record);
      return {};
    },
    rejectToolCall(toolCallId) {
      const found = openRecord(toolCallId);
      if (found.error !== undefined) {
        return found;
      }
      reject(found.record);
      return {};
    },
    acceptAll() {
      openRecords().forEach(accept);
    },
    rejectAll() {
      // The last tool call first: a later call can change content that an
      // earlier call inserted.
      openRecords().reverse().forEach(reject);
    },
    subscribe(listener) {
      const type = suggestion.get(TOOL_CALLS_TYPE);
      type.observe(listener);
      return () => type.unobserve(listener);
    },
  };
}

/**
 * Returns true if the suggestion document has the content of each item
 * that a tool call deleted.
 *
 * A Y.Doc with garbage collection removes the content of a deleted item.
 * The flag `gc` of this replica does not tell enough: its state can come
 * from a replica that collected the content, for example a collaboration
 * server.
 */
function hasContentOf(suggestion: Y.Doc, deletes: Y.IdSet): boolean {
  let expected = 0;
  deletes.forEach((range) => {
    expected += range.len;
  });
  let found = 0;
  suggestion.transact((transaction) => {
    Y.iterateStructsByIdSet(transaction, deletes, (struct) => {
      if (
        "content" in struct &&
        !(struct.content instanceof Y.ContentDeleted)
      ) {
        found += struct.length;
      }
    });
  });
  return found === expected;
}

/** Applies the part of the suggestion document with the items to the main document. */
function applyToMain(main: Y.Doc, suggestion: Y.Doc, ids: ToolCallIds): void {
  Y.applyUpdate(
    main,
    Y.intersectUpdateWithContentIds(Y.encodeStateAsUpdate(suggestion), ids),
  );
}
