import * as Y from "@y/y";
import { toBase64 } from "lib0/buffer";
import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/y";
import {
  sortSnapshotsNewestFirst,
  type VersionSnapshot,
} from "@blocknote/core/extensions";

import versionData from "./versionData.json";

export const DEMO_DOC_ID = "demo-doc";
export const DEMO_DOC_TITLE = "La Suite Docs";

const STORAGE_KEY = "bn-multi-doc-index";
const VERSIONING_KEY = `bn-versioning-${DEMO_DOC_ID}`;
const VERSIONING_CONTENTS_KEY = `${VERSIONING_KEY}-contents`;
const DOC_STATE_KEY = `bn-doc-state-${DEMO_DOC_ID}`;

// ---------------------------------------------------------------------------
// Version data types
//
// versionData.json describes an initial document state plus a series of
// transitions (incremental edits). Each transition has a name and a list of
// operations (insert / update / delete) that are applied in order.
// ---------------------------------------------------------------------------

type Operation =
  | { type: "insert"; index: number; block: PartialBlock }
  | { type: "update"; index: number; block: PartialBlock }
  | { type: "delete"; index: number };

type Transition = {
  name: string;
  operations: Operation[];
};

type VersionData = {
  initialVersion: string;
  initialBlocks: PartialBlock[];
  transitions: Transition[];
};

const data = versionData as unknown as VersionData;

// Spread versions across the last 4 hours, oldest first
const TOTAL_SPAN_MS = 4 * 60 * 60 * 1000; // 4 hours
const NEWEST_OFFSET_MS = 5 * 60 * 1000; // 5 minutes ago

// Total number of snapshots = 1 (initial) + transitions.length
const TOTAL_VERSIONS = 1 + data.transitions.length;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies a single transition's operations to the editor.
 *
 * Operations are applied **sequentially in order**. Each operation's `index`
 * references the document state after all prior operations in the same
 * transition have already been applied. This means no index adjustment
 * logic is needed – just apply them one by one.
 */
function applyTransition(
  editor: BlockNoteEditor<any, any, any>,
  transition: Transition,
): void {
  for (const op of transition.operations) {
    switch (op.type) {
      case "update": {
        const block = editor.document[op.index];
        if (block) {
          editor.updateBlock(block, op.block);
        }
        break;
      }
      case "delete": {
        const block = editor.document[op.index];
        if (block) {
          editor.removeBlocks([block]);
        }
        break;
      }
      case "insert": {
        const refBlock = editor.document[op.index];
        if (refBlock) {
          editor.insertBlocks([op.block], refBlock, "before");
        } else {
          // Past the end – append after last block
          const lastBlock = editor.document[editor.document.length - 1];
          if (lastBlock) {
            editor.insertBlocks([op.block], lastBlock, "after");
          }
        }
        break;
      }
    }
  }
}

/**
 * Builds all version snapshots using a single Y.Doc that is progressively
 * mutated via the transition operations. Each snapshot captures the cumulative
 * Y.Doc state at that point, so all snapshots share the same Yjs history and
 * produce meaningful diffs when compared.
 *
 * Returns an array of { name, base64 } in chronological order (oldest first).
 */
function buildAllSnapshots(): { name: string; base64: string }[] {
  const doc = new Y.Doc();
  const fragment = doc.get();

  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "System", color: "#000000" },
        provider: undefined,
      },
    }),
  );

  // Mount so ProseMirror initializes
  const el = document.createElement("div");
  editor.mount(el);

  const results: { name: string; base64: string }[] = [];

  // 1. Set initial content and snapshot
  editor.replaceBlocks(editor.document, data.initialBlocks);
  results.push({
    name: data.initialVersion,
    base64: toBase64(Y.encodeStateAsUpdateV2(doc)),
  });

  // 2. Apply each transition incrementally and snapshot after each
  for (const transition of data.transitions) {
    applyTransition(editor, transition);
    results.push({
      name: transition.name,
      base64: toBase64(Y.encodeStateAsUpdateV2(doc)),
    });
  }

  // Clean up
  editor.unmount();
  doc.destroy();

  return results;
}

// ---------------------------------------------------------------------------
// Preload entry point
// ---------------------------------------------------------------------------

/**
 * Seeds a demo document with pre-built version history into localStorage.
 * This is idempotent -- if the versioning data already exists, it does nothing.
 *
 * Also ensures a DocEntry exists in the doc index so the document appears
 * in the sidebar immediately.
 */
export function preloadDemoDocument(): void {
  // Guard: don't overwrite existing version data
  if (localStorage.getItem(VERSIONING_KEY)) {
    // Still ensure the doc index entry exists
    ensureDocIndexEntry();
    return;
  }

  const now = Date.now();
  const builtSnapshots = buildAllSnapshots();
  const snapshots: VersionSnapshot[] = [];
  const contents: Record<string, string> = {};

  for (let i = 0; i < builtSnapshots.length; i++) {
    const snap = builtSnapshots[i]!;
    const id = crypto.randomUUID();
    // Spread evenly: oldest = TOTAL_SPAN_MS ago, newest = NEWEST_OFFSET_MS ago
    const offsetMs =
      TOTAL_SPAN_MS -
      (i / (TOTAL_VERSIONS - 1)) * (TOTAL_SPAN_MS - NEWEST_OFFSET_MS);
    const ts = now - offsetMs;

    snapshots.push({
      id,
      name: snap.name,
      createdAt: ts,
      updatedAt: ts,
    });

    contents[id] = snap.base64;
  }

  // Write versioning data
  localStorage.setItem(
    VERSIONING_KEY,
    JSON.stringify(sortSnapshotsNewestFirst(snapshots)),
  );
  localStorage.setItem(VERSIONING_CONTENTS_KEY, JSON.stringify(contents));

  // Store the final version's Y.Doc state so the editor can load it
  const lastBase64 = builtSnapshots[builtSnapshots.length - 1]!.base64;
  localStorage.setItem(DOC_STATE_KEY, lastBase64);

  // Ensure the doc appears in the sidebar
  ensureDocIndexEntry();
}

/**
 * Ensures a DocEntry for the demo document exists in the doc index.
 */
function ensureDocIndexEntry(): void {
  type DocEntry = {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
  };

  let docs: DocEntry[];
  try {
    docs = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as DocEntry[];
  } catch {
    docs = [];
  }

  if (docs.some((d) => d.id === DEMO_DOC_ID)) {
    return;
  }

  const now = Date.now();
  docs.push({
    id: DEMO_DOC_ID,
    title: DEMO_DOC_TITLE,
    createdAt: now - TOTAL_SPAN_MS, // match first version timestamp
    updatedAt: now - NEWEST_OFFSET_MS, // match latest version timestamp
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));

  // Notify other hook instances within the same tab
  window.dispatchEvent(new Event("bn-doc-index-change"));
}
