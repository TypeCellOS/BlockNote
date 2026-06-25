import { deltaToPNode, docDiffToDelta, docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";

import { type Block, BlockNoteEditor, docToBlocks } from "../../index.js";

/**
 * Build up Yjs snapshots of a document at named points in time.
 *
 * The idea: describe a document's history as a list of named steps. Each step
 * receives the *same* editor instance that the previous step mutated, makes
 * some changes, and we record a Yjs snapshot of the document at that point. The
 * snapshots can later be reconstructed and diffed against each other.
 *
 * This deliberately does NOT use the y-prosemirror sync plugin. Instead, for
 * each step we:
 *   1. run the step's `changes` against the editor,
 *   2. diff the editor's new ProseMirror doc against the previous one
 *      (`docDiffToDelta`),
 *   3. apply that delta to a plain Y.Type inside its own transaction (tagged
 *      with the step's `attribution` as the transaction origin), building up
 *      real Yjs history,
 *   4. emit a {@link SnapshotEvent} (before / after blocks + the diff as both a
 *      Yjs update and a ProseMirror delta) via `onSnapshot`.
 *
 * Because we want snapshots to stay valid, the backing Y.Doc has gc disabled.
 *
 * @example Pre-populate a doc with attributed history, then ship it
 * ```ts
 * const editor = createSnapshotEditor();
 * const result = await buildSnapshots(editor, [
 *   { name: "Intro", attribution: { by: "alice" }, changes: (e) => {  } },
 *   { name: "Edits", attribution: { by: "bob" },   changes: (e) => {  } },
 * ], {
 *   onSnapshot: async ({ name, attribution, diff }) => {
 *     // e.g. PATCH each step to YHub with attributions (see yhub.ts), or just
 *     // collect the updates to apply server-side.
 *     await storeToServer(diff.update, { name, ...attribution });
 *   },
 * });
 *
 * // Or seed the whole document at once (matches the example's localStorage
 * // `bn-doc-state-<id>` key, which is a base64 V2 update):
 * const fullUpdate = Y.encodeStateAsUpdateV2(result.ydoc);
 * ```
 */

/** Arbitrary attribution attached to a step (e.g. `{ by: "alice" }`). */
export type SnapshotAttribution = Record<string, unknown>;

/** A single named step in the document's history. */
export type SnapshotStep = {
  name: string;
  /**
   * Optional attribution for this step's changes. Passed through to
   * `onSnapshot` and set as the Yjs transaction origin, so callers can map it
   * to e.g. YHub `customAttributions` to differentiate who changed what.
   */
  attribution?: SnapshotAttribution;
  /**
   * Mutate the editor. Receives the same editor instance the previous step
   * left off with, so changes accumulate.
   */
  changes: (editor: BlockNoteEditor<any, any, any>) => void;
};

/** The change a step introduced, as both a Yjs update and a ProseMirror delta. */
export type SnapshotDiff = {
  /**
   * V2 Yjs update containing only this step's transaction. Apply sequentially
   * (`Y.applyUpdateV2`) / PATCH to a server to rebuild the history.
   */
  update: Uint8Array;
  /** The ProseMirror delta transforming the previous doc into the new one. */
  delta: ReturnType<typeof docDiffToDelta>;
};

/** Emitted once per step, after its changes have been applied to the Y.Doc. */
export type SnapshotEvent = {
  /** Zero-based index of the step. */
  index: number;
  /** The step's name. */
  name: string;
  /** The step's attribution, if any. */
  attribution?: SnapshotAttribution;
  /** The document (block JSON) before this step's changes. */
  before: Block<any, any, any>[];
  /** The document (block JSON) after this step's changes. */
  after: Block<any, any, any>[];
  /** The change this step introduced. */
  diff: SnapshotDiff;
  /** A Yjs snapshot of the doc at this point in time. */
  snapshot: Y.Snapshot;
};

export type BuildSnapshotsOptions = {
  /** Root key / fragment name on the Y.Doc. @default "prosemirror" */
  fragment?: string;
  /**
   * Called once per step, after its changes have been applied to the Y.Doc.
   * May be async — steps are processed sequentially and each callback is
   * awaited before the next step runs, so server writes stay ordered.
   */
  onSnapshot?: (event: SnapshotEvent) => void | Promise<void>;
};

export type BuildSnapshotsResult = {
  /** The editor instance threaded through every step. */
  editor: BlockNoteEditor<any, any, any>;
  /** The backing (gc-disabled) Y.Doc holding the full history. */
  ydoc: Y.Doc;
  /** The Y.Type the ProseMirror content was synced into. */
  yType: Y.Type;
  /** The fragment / root key used on the Y.Doc. */
  fragment: string;
  /**
   * V2 update for the starting document state (the editor's initial doc),
   * before any step ran. When replaying the per-step `diff.update`s onto a
   * blank doc, apply this FIRST — the step updates are relative to it.
   */
  baseUpdate: Uint8Array;
  /** One event per step, in order. */
  snapshots: SnapshotEvent[];
};

/**
 * Run a list of named steps against a single editor, recording a Yjs snapshot
 * of the document after each step and emitting a {@link SnapshotEvent}.
 */
export async function buildSnapshots(
  editor: BlockNoteEditor<any, any, any>,
  steps: SnapshotStep[],
  options: BuildSnapshotsOptions = {},
): Promise<BuildSnapshotsResult> {
  const fragment = options.fragment ?? "prosemirror";

  // gc must be off so snapshots remain reconstructable later.
  const ydoc = new Y.Doc({ gc: false });
  const yType = ydoc.get(fragment);

  // Seed the Y.Type with the editor's starting doc so that every subsequent
  // diff is relative to a Y.Type that actually mirrors `previousDoc`. Capture
  // the empty state vector first so we can expose the seed as `baseUpdate`.
  const emptyStateVector = Y.encodeStateVector(ydoc);
  let previousDoc = editor.prosemirrorState.doc;
  ydoc.transact(() => {
    yType.applyDelta(docToDelta(previousDoc) as any);
  });
  const baseUpdate = Y.encodeStateAsUpdateV2(ydoc, emptyStateVector);

  const snapshots: SnapshotEvent[] = [];

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];

    // Let the step mutate the editor it inherited from the previous step.
    step.changes(editor);
    const newDoc = editor.prosemirrorState.doc;

    // Diff previous -> new, and apply just that delta to the Y.Type. Each step
    // is its own transaction (origin = its attribution), so the update we
    // capture below contains exactly this step's change.
    const delta = docDiffToDelta(previousDoc, newDoc);
    const beforeStateVector = Y.encodeStateVector(ydoc);
    ydoc.transact(() => {
      yType.applyDelta(delta as any);
    }, step.attribution);
    const update = Y.encodeStateAsUpdateV2(ydoc, beforeStateVector);

    const event: SnapshotEvent = {
      index,
      name: step.name,
      attribution: step.attribution,
      before: docToBlocks(previousDoc),
      after: docToBlocks(newDoc),
      diff: { update, delta },
      snapshot: Y.snapshot(ydoc),
    };
    snapshots.push(event);
    await options.onSnapshot?.(event);

    previousDoc = newDoc;
  }

  return { editor, ydoc, yType, fragment, baseUpdate, snapshots };
}

/**
 * Reconstruct the ProseMirror root node a snapshot represented.
 */
export function snapshotToProsemirrorNode(
  result: Pick<BuildSnapshotsResult, "editor" | "ydoc" | "fragment">,
  snapshot: Y.Snapshot,
) {
  const restored = Y.createDocFromSnapshot(result.ydoc, snapshot);
  const restoredType = restored.get(result.fragment);
  return deltaToPNode(restoredType.toDeltaDeep(), result.editor.pmSchema, null);
}

/**
 * Reconstruct the BlockNote document (block JSON) a snapshot represented.
 */
export function snapshotToBlocks(
  result: Pick<BuildSnapshotsResult, "editor" | "ydoc" | "fragment">,
  snapshot: Y.Snapshot,
): Block<any, any, any>[] {
  return docToBlocks(snapshotToProsemirrorNode(result, snapshot));
}

/**
 * Diff two snapshots, returning the before/after blocks and the ProseMirror
 * delta that transforms one into the other.
 */
export function diffSnapshots(
  result: Pick<BuildSnapshotsResult, "editor" | "ydoc" | "fragment">,
  before: Y.Snapshot,
  after: Y.Snapshot,
) {
  const beforeNode = snapshotToProsemirrorNode(result, before);
  const afterNode = snapshotToProsemirrorNode(result, after);

  return {
    before: docToBlocks(beforeNode),
    after: docToBlocks(afterNode),
    delta: docDiffToDelta(beforeNode, afterNode),
  };
}
