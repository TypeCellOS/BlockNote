import type {
  VersionSnapshot,
  VersioningState,
  VersionSelection,
} from "@blocknote/core/extensions";

export type { VersionSnapshot } from "@blocknote/core/extensions";
export type LoadedVersioningList = {
  loaded: true;
  current: VersionSnapshot | undefined;
  snapshots: VersionSnapshot[];
};
export const CURRENT_VERSION_ID = "blocknote:frozen-current";

/** Current can be a local capture or the newest stored checkpoint. */
export function getVersionSelection(
  view: VersioningState,
  snapshot: VersionSnapshot,
  isCurrent: boolean,
): VersionSelection {
  return isCurrent &&
    view.mode === "versions" &&
    view.showCurrentVersion !== false
    ? { type: "current" }
    : { type: "snapshot", id: snapshot.id };
}

export function getVersionList(
  state: VersioningState,
): LoadedVersioningList | { loaded: false } {
  if (state.mode === "live" || state.history.data === undefined) {
    return { loaded: false };
  }
  return {
    loaded: true,
    current:
      state.showCurrentVersion === false
        ? state.history.data[0]
        : { id: CURRENT_VERSION_ID, createdAt: state.capturedAt },
    snapshots: state.history.data,
  };
}

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
    ...(list.current ? [{ snapshot: list.current, isCurrent: true }] : []),
    ...list.snapshots
      .filter((snapshot) => snapshot.id !== list.current?.id)
      .filter((snapshot) => !namedOnly || (snapshot.name?.length ?? 0) > 0)
      .map((snapshot) => ({ snapshot, isCurrent: false })),
  ];
}

/** The row currently shown in the editor, if the editor is in preview mode. */
export function getShownVersionRow(
  list: LoadedVersioningList,
  view: VersioningState,
): VisibleVersionRow | undefined {
  switch (view.mode) {
    case "live":
      return undefined;
    case "versions": {
      if (view.displayed.type === "current") {
        return list.current
          ? { snapshot: list.current, isCurrent: true }
          : undefined;
      }
      const id = view.displayed.id;
      const snapshot = list.snapshots.find((candidate) => candidate.id === id);
      return snapshot
        ? { snapshot, isCurrent: snapshot.id === list.current?.id }
        : undefined;
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
  view: VersioningState,
  versionId: string,
): boolean {
  return (
    view.mode !== "live" &&
    (view.compareTo === versionId ||
      (view.displayed.type === "snapshot" && view.displayed.id === versionId))
  );
}
