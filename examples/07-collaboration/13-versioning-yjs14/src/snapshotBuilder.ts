import { type Block, BlockNoteEditor, docToBlocks } from "@blocknote/core";
import { docDiffToDelta } from "@blocknote/core/y";
import { deltaToPNode, docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";

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
 * @example Pre-populate a doc with multi-author history, then ship it
 * ```ts
 * const editor = createSnapshotEditor();
 * const result = await buildSnapshots(editor, [
 *   {
 *     name: "Intro",
 *     contributions: [
 *       { attribution: { by: "alice" }, changes: (e) => {  } },
 *       { attribution: { by: "bob" },   changes: (e) => {  } },
 *     ],
 *   },
 * ], {
 *   onSnapshot: async ({ name, contributions }) => {
 *     // e.g. PATCH each contribution to YHub attributed to its author (see
 *     // yhub.ts), then commit a single version marker named `name`.
 *     for (const { attribution, update } of contributions) {
 *       await storeToServer(update, { ...attribution });
 *     }
 *   },
 * });
 *
 * // Or seed the whole document at once (matches the example's localStorage
 * // `bn-doc-state-<id>` key, which is a base64 V2 update):
 * const fullUpdate = Y.encodeStateAsUpdateV2(result.ydoc);
 * ```
 */

/** Arbitrary attribution attached to a contribution (e.g. `{ by: "alice" }`). */
export type SnapshotAttribution = Record<string, unknown>;

/**
 * A single attributed contribution to a version. Each contribution is applied
 * in its own Yjs transaction (origin = its `attribution`), so a single version
 * can carry content authored by several different users.
 */
export type SnapshotContribution = {
  /**
   * Attribution for this contribution's changes (e.g. `{ by: "alice" }`). Set
   * as the Yjs transaction origin, so callers can map it to e.g. YHub
   * `customAttributions` / `?userid=` to differentiate who changed what.
   */
  attribution?: SnapshotAttribution;
  /**
   * Mutate the editor. Receives the same editor instance the previous
   * contribution (or step) left off with, so changes accumulate.
   */
  changes: (editor: BlockNoteEditor<any, any, any>) => void;
};

/** A single named version in the document's history, built from one or more attributed contributions. */
export type SnapshotStep = {
  name: string;
  /** The attributed contributions that together produce this version. */
  contributions: SnapshotContribution[];
};

/** One attributed contribution's change, as both a Yjs update and a ProseMirror delta. */
export type SnapshotContributionDiff = {
  /** Attribution for this contribution, if any. */
  attribution?: SnapshotAttribution;
  /**
   * V2 Yjs update containing only this contribution's transaction. Apply
   * sequentially (`Y.applyUpdateV2`) / PATCH to a server to rebuild the history.
   */
  update: Uint8Array;
  /** The ProseMirror delta transforming the previous doc into the new one. */
  delta: ReturnType<typeof docDiffToDelta>;
};

/** Emitted once per step, after all of its contributions have been applied to the Y.Doc. */
export type SnapshotEvent = {
  /** Zero-based index of the step. */
  index: number;
  /** The step's name. */
  name: string;
  /**
   * The attributed contributions that produced this version, in order. Always
   * at least one; no-op contributions (that changed nothing) are omitted.
   */
  contributions: SnapshotContributionDiff[];
  /** The document (block JSON) before this step's changes. */
  before: Block<any, any, any>[];
  /** The document (block JSON) after this step's changes. */
  after: Block<any, any, any>[];
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
    const beforeDoc = previousDoc;

    // Each contribution mutates the editor in its own transaction (origin = its
    // attribution), so we capture one update per author. Together they produce
    // this version — but the version marker is committed separately by the
    // consumer (see seed.ts), letting multiple users be attributed within it.
    const contributions: SnapshotContributionDiff[] = [];
    for (const contribution of step.contributions) {
      const docBefore = previousDoc;
      editor.transact(() => {
        contribution.changes(editor);
      });
      const newDoc = editor.prosemirrorState.doc;
      previousDoc = newDoc;

      // Skip no-op contributions: the author changed nothing, so there is no
      // update to attribute or PATCH.
      if (newDoc.eq(docBefore)) {
        continue;
      }

      const delta = docDiffToDelta(docBefore, newDoc);
      const beforeStateVector = Y.encodeStateVector(ydoc);
      ydoc.transact(() => {
        yType.applyDelta(delta as any);
      }, contribution.attribution);
      const update = Y.encodeStateAsUpdateV2(ydoc, beforeStateVector);

      contributions.push({
        attribution: contribution.attribution,
        update,
        delta,
      });
    }

    const event: SnapshotEvent = {
      index,
      name: step.name,
      contributions,
      before: docToBlocks(beforeDoc),
      after: docToBlocks(previousDoc),
      snapshot: Y.snapshot(ydoc),
    };
    snapshots.push(event);
    await options.onSnapshot?.(event);
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
  const node = deltaToPNode(
    restoredType.toDeltaDeep(),
    result.editor.pmSchema,
    null,
  );
  if (node === null) {
    throw new Error("failed to materialize snapshot into a ProseMirror node");
  }
  return node;
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
