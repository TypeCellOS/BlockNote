import type { BlockNoteEditor } from "@blocknote/core";
import type { SnapshotContribution } from "@blocknote/core/y";

import { applyVersion } from "./reconcile";
import type { VersionBlock } from "./reconcile";

/**
 * Split the work of reaching `target` (from `base`) across several `authors`,
 * so a single version ends up attributed to *multiple* users.
 *
 * The document's top-level sections are round-robin–assigned to `authors` by
 * position. Each author then gets one {@link SnapshotContribution} that reveals
 * only their assigned sections (in `target` form) while leaving everyone else's
 * sections in their `base` form — so each author's transaction touches only
 * their own sections. The contributions are cumulative: applied in order, the
 * last one yields the full `target`.
 *
 * `buildSnapshots` runs each contribution in its own attributed Yjs
 * transaction, and `seedYHubDocument` PATCHes each as separate authored content
 * before committing one version marker — which is what lands multiple users
 * inside the one version. Contributions that turn out to be no-ops (an author
 * whose sections didn't actually change) are dropped by `buildSnapshots`.
 */
export function buildContributions(
  base: VersionBlock[],
  target: VersionBlock[],
  authors: string[],
): SnapshotContribution[] {
  return authors.map((by, authorIndex) => ({
    attribution: { by },
    changes: (editor: BlockNoteEditor<any, any, any>) =>
      applyVersion(
        editor,
        intermediateTarget(base, target, authors, authorIndex),
      ),
  }));
}

/**
 * The document as it should look once authors `0..revealUpTo` (inclusive) have
 * contributed: their assigned `target` sections are revealed, every other
 * pre-existing section stays in its `base` form, and sections owned by a
 * not-yet-revealed author that don't exist in `base` are omitted.
 */
function intermediateTarget(
  base: VersionBlock[],
  target: VersionBlock[],
  authors: string[],
  revealUpTo: number,
): VersionBlock[] {
  const baseById = new Map(base.map((section) => [section.id, section]));
  const out: VersionBlock[] = [];

  target.forEach((section, position) => {
    const authorIndex = position % authors.length;
    if (authorIndex <= revealUpTo) {
      // This author has contributed: reveal the section in its target form.
      out.push(section);
    } else {
      // Not yet revealed: keep the pre-existing section untouched, or omit it
      // entirely if it's brand new (so reconcile doesn't add it early).
      const previous = baseById.get(section.id);
      if (previous) {
        out.push(previous);
      }
    }
  });

  return out;
}
