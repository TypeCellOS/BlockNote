import type {
  VersionSnapshot,
  VersionSnapshotIdentifier,
  VersioningList,
  VersioningPreviewView,
  VersioningState,
  VersioningStatus,
} from "./types.js";

/** Previewing and restoring both hold the editor read-only. */
export function isReadOnly(state: VersioningState): boolean {
  return state.view.mode !== "live" || state.restoring;
}

/** The current row when `id` names it, otherwise a stored snapshot. */
export function findSnapshot(
  list: VersioningList,
  id: VersionSnapshotIdentifier | undefined,
): VersionSnapshot | undefined {
  if (id === undefined || !list.loaded) {
    return undefined;
  }
  const key = typeof id === "object" ? id.id : id;
  return list.current.id === key
    ? list.current
    : list.snapshots.find((snapshot) => snapshot.id === key);
}

/** Resolve a comparison baseline, or `undefined` when none is given. */
export function resolveCompareTo(
  list: VersioningList,
  compareTo: VersionSnapshotIdentifier | undefined,
): VersionSnapshot | undefined {
  if (compareTo === undefined) {
    return undefined;
  }
  const snapshot = findSnapshot(list, compareTo);
  if (snapshot === undefined) {
    throw new Error(
      `Snapshot not found: ${typeof compareTo === "object" ? compareTo.id : compareTo}`,
    );
  }
  return snapshot;
}

/**
 * The busy indicator the sidebar shows, derived from the two in-flight
 * operations. Preview loading outranks listing: a fetch is the more urgent
 * thing to communicate, and reverting to `listing` when it settles keeps a
 * slow list request visible.
 */
export function deriveStatus(
  listing: boolean,
  loadingPreview: VersioningPreviewView | undefined,
): VersioningStatus {
  if (loadingPreview) {
    return { type: "loading-preview", view: loadingPreview };
  }
  return listing ? { type: "listing" } : { type: "idle" };
}
