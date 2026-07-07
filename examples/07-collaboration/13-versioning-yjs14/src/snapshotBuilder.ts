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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// The timeline is built by accumulating per-edit and inter-version gaps, then
// shifted so its newest entry lands at "now" (see the re-base at the end). The
// gaps below skew heavily toward days, so the whole history spans several weeks.
//
// Inter-edit gaps are sampled at *random*, centered on ~8h with a very wide
// multiplicative spread, so the timeline reads like real editing (clusters plus
// random lulls) rather than an even mechanical spread — and skews hard toward
// days. The wide spread is deliberate: a large fraction of *within-version* gaps
// land in the 1–5d range, which creates many day-scale boundaries beyond the 4
// version transitions. That's what gives the 3–7d grouping choices real variety —
// with only 5 versions there'd otherwise be too few day-scale gaps to tell those
// choices apart. The cost is a long total history (a couple of months), which is
// an accepted trade for that variety. We approximate a log-normal: average
// several uniforms in log-space (central-limit → a bell around the median) so
// most gaps land near 8h with a long tail out to several days.
const EDIT_GAP_MEDIAN_MS = 8 * HOUR_MS;
// Multiplicative spread: a "typical" gap is within EDIT_GAP_SPREAD× / ÷ of the
// median, i.e. roughly 40m … 4d, with rarer values further out.
const EDIT_GAP_SPREAD = 12;

/** A random gap, log-normal-ish around EDIT_GAP_MEDIAN_MS. */
const randomEditGap = () => {
  // Average of 3 uniforms in [-1, 1] → an approximately-normal exponent in the
  // same range but concentrated near 0 (so near the median).
  const n = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // ~[-1, 1]
  return EDIT_GAP_MEDIAN_MS * Math.pow(EDIT_GAP_SPREAD, n);
};

// After a version's edits, a large gap runs to the next version. For the
// multi-day grouping choices to each do something distinct, the boundary gaps
// must be *spread across* the day-scale range rather than clustered — otherwise
// once `groupMaxGap` clears the cluster, every boundary merges at once and 2d…7d
// all look the same. So instead of sampling each boundary from one wide random
// range, we deal out a fixed set of well-separated sizes (with mild jitter so it
// still looks organic). The sizes span 2–8 days so no single day choice merges
// all the version boundaries at once — even 7d leaves the 8d boundary un-merged,
// and the abundant within-version day-scale gaps fill in the rest of the variety.
const INTER_VERSION_GAP_TARGETS_DAYS = [2, 4, 6, 8];

const interVersionGap = (boundaryIndex: number) => {
  const base =
    INTER_VERSION_GAP_TARGETS_DAYS[
      boundaryIndex % INTER_VERSION_GAP_TARGETS_DAYS.length
    ] * DAY_MS;
  // ±15% jitter so the boundaries aren't suspiciously round, while staying well
  // clear of the neighbouring targets.
  return base * (0.85 + Math.random() * 0.3);
};

// How many consecutive patches one author keeps before we (maybe) hand off to
// another. YHub only merges *same-author* adjacent edits, so assigning authors
// in contiguous runs — rather than randomly per patch — lets those runs collapse
// into a handful of grouped entries, keeping the seeded history short and
// readable while still crediting several contributors per version.
const MIN_AUTHOR_RUN = 4;
const MAX_AUTHOR_RUN = 7;

const randomAuthor = (authors: string[]) =>
  authors[Math.floor(Math.random() * authors.length)];

const randomRunLength = () =>
  MIN_AUTHOR_RUN +
  Math.floor(Math.random() * (MAX_AUTHOR_RUN - MIN_AUTHOR_RUN + 1));

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

  // A running clock, advanced by a random gap per edit and by a large random gap
  // between versions. Absolute origin doesn't matter — the whole timeline is
  // re-based to end at "now" below — so start at 0.
  let clock = 0;

  const resultSteps: BuildEditHistoryResult["steps"] = [];

  steps.forEach((step, stepIndex) => {
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

    // A large gap separates this version's edits from the previous version's, so
    // the day/week choices can collapse whole versions together. Each boundary
    // uses a distinct, well-separated size (see `interVersionGap`) so the day
    // choices each peel off one more boundary.
    if (stepIndex > 0) {
      clock += interVersionGap(stepIndex - 1);
    }

    const patches: CapturedPatch[] = [];
    let lastAuthor: string | undefined;
    // Assign authors in contiguous runs so same-author streaks can group. Start
    // a run, and once it's exhausted switch to a *different* author (when the
    // version has more than one) so the handoff is real.
    let currentAuthor = randomAuthor(step.authors);
    let runRemaining = randomRunLength();
    captured.forEach(({ before, doc }, patchIndex) => {
      if (runRemaining <= 0) {
        const others = step.authors.filter((a) => a !== currentAuthor);
        currentAuthor =
          others.length > 0 ? randomAuthor(others) : currentAuthor;
        runRemaining = randomRunLength();
      }
      runRemaining--;

      const delta = docDiffToDelta(before, doc);
      const beforeSV = Y.encodeStateVector(ydoc);
      const by = currentAuthor;
      ydoc.transact(
        () => {
          yType.applyDelta(delta as any);
        },
        { by },
      );
      const update = Y.encodeStateAsUpdateV2(ydoc, beforeSV);
      // Advance by a random gap (except before the very first edit of the very
      // first version, which sits at the window start).
      if (!(stepIndex === 0 && patchIndex === 0)) {
        clock += randomEditGap();
      }
      patches.push({ update, by, at: Math.floor(clock) });
      lastAuthor = by;
    });
    resultSteps.push({
      name: step.name,
      id: String(uint32()),
      by: lastAuthor,
      // Marker right after this version's last edit.
      at: Math.floor(clock),
      patches,
    });
  });

  // The accumulated ladder + inter-version gaps rarely sum to exactly
  // HISTORY_SPAN_MS, so shift the whole timeline (preserving every relative gap)
  // to end at "now" — the newest edit becomes the most recent, as expected.
  const latest = resultSteps.reduce((max, step) => Math.max(max, step.at), 0);
  const shift = Date.now() - latest;
  for (const step of resultSteps) {
    step.at += shift;
    for (const patch of step.patches) {
      patch.at += shift;
    }
  }

  return { baseUpdate, steps: resultSteps };
}
