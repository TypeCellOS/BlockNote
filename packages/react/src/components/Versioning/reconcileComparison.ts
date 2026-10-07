import type {
  VersioningState,
  VersionSnapshot,
} from "@blocknote/core/extensions";

import {
  getPreviousVisibleVersion,
  getShownVersionRow,
  getVersionList,
  getVisibleVersionRows,
  viewReferencesVersion,
} from "./visibleHistory.js";

/** The shown row to re-preview after a successful history mutation, if needed. */
export function getComparisonReconciliation(
  before: VersioningState,
  after: VersioningState,
  changedId: string,
  comparisonMode: boolean,
  namedOnly: boolean,
): VersionSnapshot | undefined {
  if (!comparisonMode || !viewReferencesVersion(before, changedId)) {
    return undefined;
  }
  const list = getVersionList(after);
  const previousList = getVersionList(before);
  if (after.mode !== "versions" || !list.loaded || !previousList.loaded) {
    return undefined;
  }
  // Ordinary renames and unrelated mutations must not reset explicit baselines.
  // A hidden source remains selected, but cannot have a chronological baseline.
  const wasVisible = getVisibleVersionRows(previousList, namedOnly).some(
    (row) => row.snapshot.id === changedId,
  );
  const isVisible = getVisibleVersionRows(list, namedOnly).some(
    (row) => row.snapshot.id === changedId,
  );
  const previousShown = getShownVersionRow(previousList, before);
  const shown = getShownVersionRow(list, after);
  if (
    wasVisible === isVisible &&
    previousShown?.snapshot.id === shown?.snapshot.id
  ) {
    return undefined;
  }
  return shown &&
    after.compareTo !==
      getPreviousVisibleVersion(list, shown.snapshot, namedOnly)?.id
    ? shown.snapshot
    : undefined;
}
