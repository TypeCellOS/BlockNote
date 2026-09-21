import type {
  LoadedVersioningList,
  VersioningView,
  VersionSnapshot,
} from "@blocknote/core/extensions";

export type VisibleVersionRow = {
  snapshot: VersionSnapshot;
  isCurrent: boolean;
};

/** Current plus the stored versions which survive the active filter. */
export function getVisibleVersionRows(
  list: LoadedVersioningList,
  namedOnly: boolean,
): VisibleVersionRow[] {
  return [
    { snapshot: list.current, isCurrent: true },
    ...list.snapshots
      .filter((snapshot) => !namedOnly || (snapshot.name?.length ?? 0) > 0)
      .map((snapshot) => ({ snapshot, isCurrent: false })),
  ];
}

/** The row currently shown in the editor, if the editor is in preview mode. */
export function getShownVersionRow(
  list: LoadedVersioningList,
  view: VersioningView,
): VisibleVersionRow | undefined {
  switch (view.mode) {
    case "live":
      return undefined;
    case "current":
      return { snapshot: list.current, isCurrent: true };
    case "snapshot": {
      const snapshot = list.snapshots.find(
        (candidate) => candidate.id === view.snapshotId,
      );
      return snapshot ? { snapshot, isCurrent: false } : undefined;
    }
  }
}

/** The next older visible stored version, used as a comparison baseline. */
export function getPreviousVisibleVersion(
  list: LoadedVersioningList,
  row: VersionSnapshot,
  namedOnly: boolean,
): VersionSnapshot | undefined {
  const rows = getVisibleVersionRows(list, namedOnly);
  const rowIndex = rows.findIndex(
    (candidate) => candidate.snapshot.id === row.id,
  );
  return rowIndex === -1 ? undefined : rows[rowIndex + 1]?.snapshot;
}

/** Whether a preview shows or compares against the given stored version. */
export function viewReferencesVersion(
  view: VersioningView,
  versionId: string,
): boolean {
  return (
    view.mode !== "live" &&
    (view.compareToId === versionId ||
      (view.mode === "snapshot" && view.snapshotId === versionId))
  );
}
