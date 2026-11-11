import * as Y from "@y/y";

import type { ToolCallReview } from "../tools/documentTools.js";
import type { AgentToolCall } from "../tools/agentDocument.js";

// The records of the tool calls of an agent in a Yjs 14 suggestion
// document (S). S has the main document (M) and the suggestions: a
// suggestion is content that is in S and not in M. The suggestion layer of
// Yjs 14 does not know which tool call made a suggestion, and it has no
// place for the reason of a change. The records add this:
//
// - For each tool call: its reason, and the Yjs items that it inserted and
//   deleted in S. The record is in the Yjs transaction of the write of the
//   tool call. Thus, each replica gets the record with the content.
// - For each tool call with a decision of a user: the decision.
//
// The records are attributes of a type of S. They are not a part of the
// document content.

/** The name of the type in a suggestion document that has the records. */
export const TOOL_CALLS_TYPE = "document-agent";

const CALL_PREFIX = "call:";
const DECISION_PREFIX = "decision:";

/** The Yjs items that a tool call inserted and deleted in the suggestion document. */
export type ToolCallIds = { inserts: Y.IdSet; deletes: Y.IdSet };

/** The record of one tool call of an agent. */
export type ToolCallRecord = AgentToolCall & {
  /** The position of the tool call in the sequence of the tool calls of the document. */
  seq: number;
  ids: ToolCallIds;
  /** The decision of a user, or `undefined` if the change is open. */
  decision: ToolCallReview | undefined;
};

/** A record as an attribute value of the type. */
type StoredRecord = {
  seq: number;
  reason: string;
  inserts: Uint8Array;
  deletes: Uint8Array;
};

function recordsType(suggestion: Y.Doc) {
  return suggestion.get(TOOL_CALLS_TYPE);
}

/** Returns the value as a stored record, or `undefined` for a different value. */
function asStoredRecord(value: unknown): StoredRecord | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { seq, reason, inserts, deletes } = value as Partial<StoredRecord>;
  return typeof seq === "number" &&
    typeof reason === "string" &&
    inserts instanceof Uint8Array &&
    deletes instanceof Uint8Array
    ? { seq, reason, inserts, deletes }
    : undefined;
}

/**
 * Writes the record of a tool call. Call it in the Yjs transaction of the
 * write of the tool call, after the write: the items of the transaction to
 * that point are the items of the tool call.
 */
export function writeToolCallRecord(
  transaction: Y.Transaction,
  toolCall: AgentToolCall,
): void {
  const type = recordsType(transaction.doc);
  let seq = 1;
  type.forEachAttr((_value: unknown, key: string | number) => {
    if (String(key).startsWith(CALL_PREFIX)) {
      seq++;
    }
  });
  const stored: StoredRecord = {
    seq,
    reason: toolCall.reason,
    inserts: Y.encodeIdSet(transaction.insertSet),
    deletes: Y.encodeIdSet(transaction.deleteSet),
  };
  type.setAttr(`${CALL_PREFIX}${toolCall.toolCallId}`, stored);
}

/** The stored records of the suggestion document, by tool call ID. */
function storedRecordsOf(suggestion: Y.Doc): Map<string, StoredRecord> {
  const records = new Map<string, StoredRecord>();
  recordsType(suggestion).forEachAttr(
    (value: unknown, key: string | number) => {
      const name = String(key);
      const stored = name.startsWith(CALL_PREFIX)
        ? asStoredRecord(value)
        : undefined;
      if (stored !== undefined) {
        records.set(name.slice(CALL_PREFIX.length), stored);
      }
    },
  );
  return records;
}

function idsOf(stored: StoredRecord): ToolCallIds {
  return {
    inserts: Y.decodeIdSet(stored.inserts),
    deletes: Y.decodeIdSet(stored.deletes),
  };
}

/** The records of the tool calls of the suggestion document, in the sequence of the calls. */
export function toolCallRecordsOf(suggestion: Y.Doc): ToolCallRecord[] {
  const type = recordsType(suggestion);
  const records: ToolCallRecord[] = [];
  for (const [toolCallId, stored] of storedRecordsOf(suggestion)) {
    const decision: unknown = type.getAttr(`${DECISION_PREFIX}${toolCallId}`);
    records.push({
      toolCallId,
      seq: stored.seq,
      reason: stored.reason,
      ids: idsOf(stored),
      decision:
        decision === "accepted" || decision === "rejected"
          ? decision
          : undefined,
    });
  }
  return records.sort((a, b) => a.seq - b.seq);
}

/** Writes the decision of a user for a tool call. */
export function writeDecision(
  suggestion: Y.Doc,
  toolCallId: string,
  decision: ToolCallReview,
): void {
  recordsType(suggestion).setAttr(`${DECISION_PREFIX}${toolCallId}`, decision);
}

/**
 * The attributions of the suggestions of a suggestion document, for the
 * diff renderer of Yjs 14 (`Y.createDiffRenderer`): the author of each
 * suggestion of a tool call is the ID of the tool call. Thus, each
 * suggestion mark in an editor has the ID of its tool call (`userIds` of
 * the mark).
 *
 * Call this before `Y.createDiffRenderer`: the renderer reads the
 * attributions of new content in a listener of the document, and the
 * listener of this function must run first.
 */
export function watchToolCallAttributions(suggestion: Y.Doc): {
  attributions: Y.ContentMap;
  destroy(): void;
} {
  const attributions = Y.createContentMap();
  const known = new Set<string>();
  function update() {
    for (const [toolCallId, stored] of storedRecordsOf(suggestion)) {
      if (known.has(toolCallId)) {
        continue;
      }
      known.add(toolCallId);
      const ids = idsOf(stored);
      Y.insertIntoIdMap(
        attributions.inserts,
        Y.createIdMapFromIdSet(ids.inserts, [
          Y.createContentAttribute("insert", toolCallId),
        ]),
      );
      Y.insertIntoIdMap(
        attributions.deletes,
        Y.createIdMapFromIdSet(ids.deletes, [
          Y.createContentAttribute("delete", toolCallId),
        ]),
      );
    }
  }
  update();
  suggestion.on("beforeObserverCalls", update);
  return {
    attributions,
    destroy() {
      suggestion.off("beforeObserverCalls", update);
    },
  };
}
