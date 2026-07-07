import { BlockNoteEditor } from "@blocknote/core";
import { docDiffToDelta } from "@blocknote/core/y";
import { docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import { uint32 } from "lib0/random";

import { applyVersionUnbatched, type VersionBlock } from "./reconcile";

/**
 * Build up a realistic per-transaction edit history for a document.
 *
 * The idea: describe a document's history as a list of named steps. Each step
 * reconciles the *same* editor instance towards a target document, producing a
 * burst of ProseMirror transactions. We capture every content-changing
 * transaction, diff its before/after ProseMirror docs (`docDiffToDelta`), apply
 * that delta to a plain Y.Type in its own Yjs transaction (tagged with a random
 * author as origin), and record the resulting V2 update. The captured updates
 * can later be PATCHed to a server (see seed.ts) to rebuild the history, with a
 * `type:version` marker committed at the end of each step.
 *
 * The backing Y.Doc has gc disabled so history stays reconstructable.
 */

/** A single named version target in the document's history. */
export type EditHistoryStep = {
  name: string;
  /** The document blocks the editor should be reconciled towards. */
  target: VersionBlock[];
  /** Candidate author ids; each captured transaction is attributed to one at random. */
  authors: string[];
};

/** One captured transaction, as a V2 Yjs update plus its attribution and timestamp. */
export type CapturedPatch = {
  /** V2 Yjs update containing only this transaction's changes. */
  update: Uint8Array;
  /** The author id this transaction was attributed to, if any. */
  by?: string;
  /** Synthetic wall-clock timestamp (unix-ms) for this transaction. */
  at: number;
};

export type BuildEditHistoryResult = {
  /**
   * V2 update for the starting document state (the editor's initial doc),
   * before any step ran. When replaying the per-step patches onto a blank doc,
   * apply this FIRST — the step patches are relative to it.
   */
  baseUpdate: Uint8Array;
  /** One entry per step, in order, each carrying its captured transactions. */
  steps: Array<{
    name: string;
    id: string;
    by?: string;
    at: number;
    patches: CapturedPatch[];
  }>;
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const MIN_STEP_MS = 200;
const MAX_STEP_MS = 10_000;

const randomStep = () =>
  Math.floor(MIN_STEP_MS + Math.random() * (MAX_STEP_MS - MIN_STEP_MS));

const randomAuthor = (authors: string[]) =>
  authors[Math.floor(Math.random() * authors.length)];

/**
 * Reconcile an editor through a list of named steps, capturing every
 * content-changing ProseMirror transaction along the way and recording it as an
 * attributed, timestamped Yjs update.
 */
export async function buildEditHistory(
  editor: BlockNoteEditor<any, any, any>,
  steps: EditHistoryStep[],
  options: { fragment: string },
): Promise<BuildEditHistoryResult> {
  // gc must be off so history remains reconstructable later.
  const ydoc = new Y.Doc({ gc: false });
  const yType = ydoc.get(options.fragment);

  // Seed the Y.Type with the editor's starting doc so that every subsequent
  // diff is relative to a Y.Type that actually mirrors the editor. Capture the
  // empty state vector first so we can expose the seed as `baseUpdate`.
  const emptyStateVector = Y.encodeStateVector(ydoc);
  ydoc.transact(() => {
    yType.applyDelta(docToDelta(editor.prosemirrorState.doc) as any);
  });
  const baseUpdate = Y.encodeStateAsUpdateV2(ydoc, emptyStateVector);

  let clock = Date.now() - TWO_DAYS_MS;
  const resultSteps: BuildEditHistoryResult["steps"] = [];

  for (const step of steps) {
    // Capture each content-changing transaction the reconciliation produces.
    const captured: Array<{ before: any; doc: any }> = [];
    const onUpdate = ({ transaction }: any) => {
      if (!transaction.docChanged) {
        return;
      }
      captured.push({ before: transaction.before, doc: transaction.doc });
    };
    editor._tiptapEditor.on("update", onUpdate);
    // Unbatched: each block op runs as its own top-level transaction, firing an
    // individual tiptap `update` — so a multi-edit version yields many small
    // captured transactions rather than one collapsed one.
    applyVersionUnbatched(editor, step.target);
    editor._tiptapEditor.off("update", onUpdate);

    const patches: CapturedPatch[] = [];
    let lastAuthor: string | undefined;
    for (const { before, doc } of captured) {
      const delta = docDiffToDelta(before, doc);
      const beforeSV = Y.encodeStateVector(ydoc);
      const by = randomAuthor(step.authors);
      ydoc.transact(
        () => {
          yType.applyDelta(delta as any);
        },
        { by },
      );
      const update = Y.encodeStateAsUpdateV2(ydoc, beforeSV);
      clock += randomStep();
      patches.push({ update, by, at: clock });
      lastAuthor = by;
    }
    clock += randomStep();
    resultSteps.push({
      name: step.name,
      id: String(uint32()),
      by: lastAuthor,
      at: clock,
      patches,
    });
  }

  return { baseUpdate, steps: resultSteps };
}
