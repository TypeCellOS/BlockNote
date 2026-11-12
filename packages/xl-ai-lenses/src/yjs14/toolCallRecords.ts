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
// document content. A tool call has three attributes: its record (the
// reason and the position in the sequence), and the two sets of its Yjs
// items as binary data. The sets are not a part of the record: Yjs 14
// freezes an attribute value that is an object, and a binary array in it
// cannot freeze.

/** The name of the type in a suggestion document that has the records. */
export const TOOL_CALLS_TYPE = "document-agent";

const CALL_PREFIX = "call:";
const INSERTS_PREFIX = "inserts:";
const DELETES_PREFIX = "deletes:";
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

/** A record as attribute values of the type: the record, and the two sets of items. */
type StoredRecord = {
  seq: number;
  reason: string;
  inserts: Uint8Array;
  deletes: Uint8Array;
};

function recordsType(suggestion: Y.Doc) {
  return suggestion.get(TOOL_CALLS_TYPE);
}

/**
 * Returns the stored record of a tool call from its three attribute
 * values, or `undefined` if a value is missing or is of a different kind.
 */
function asStoredRecord(
  record: unknown,
  inserts: unknown,
  deletes: unknown,
): StoredRecord | undefined {
  if (typeof record !== "object" || record === null) {
    return undefined;
  }
  const { seq, reason } = record as { seq?: unknown; reason?: unknown };
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
  // The sets first: the record is the last attribute, and the items of
  // the three attributes are not in the sets.
  const inserts = Y.encodeIdSet(transaction.insertSet);
  const deletes = Y.encodeIdSet(transaction.deleteSet);
  type.setAttr(`${INSERTS_PREFIX}${toolCall.toolCallId}`, inserts);
  type.setAttr(`${DELETES_PREFIX}${toolCall.toolCallId}`, deletes);
  type.setAttr(`${CALL_PREFIX}${toolCall.toolCallId}`, {
    seq,
    reason: toolCall.reason,
  });
}

/** The stored records of the suggestion document, by tool call ID. */
function storedRecordsOf(suggestion: Y.Doc): Map<string, StoredRecord> {
  const records = new Map<string, StoredRecord>();
  const type = recordsType(suggestion);
  type.forEachAttr((value: unknown, key: string | number) => {
    const name = String(key);
    if (!name.startsWith(CALL_PREFIX)) {
      return;
    }
    const toolCallId = name.slice(CALL_PREFIX.length);
    const stored = asStoredRecord(
      value,
      type.getAttr(`${INSERTS_PREFIX}${toolCallId}`),
      type.getAttr(`${DELETES_PREFIX}${toolCallId}`),
    );
    if (stored !== undefined) {
      records.set(toolCallId, stored);
    }
  });
  return records;
}

function idsOf(stored: StoredRecord): ToolCallIds {
  return {
    inserts: Y.decodeIdSet(stored.inserts),
    deletes: Y.decodeIdSet(stored.deletes),
  };
}

/** The IDs of the tool calls of the suggestion document. */
export function toolCallIdsOf(suggestion: Y.Doc): string[] {
  return [...storedRecordsOf(suggestion).keys()];
}

/** True if the suggestion document has the record of a tool call with the ID. */
export function hasToolCallRecord(suggestion: Y.Doc, id: string): boolean {
  return recordsType(suggestion).getAttr(`${CALL_PREFIX}${id}`) !== undefined;
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
