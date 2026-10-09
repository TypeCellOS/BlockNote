import type {
  VersionError,
  VersioningState,
  VersionSelection,
  VersionSnapshot,
} from "./types.js";

export type VersioningEvent =
  | {
      type: "opened";
      capturedAt: number;
      showCurrentVersion: boolean;
      restoring: boolean;
    }
  | { type: "closed"; restoring?: boolean }
  | { type: "historyStarted"; operation: "refresh" | "loadMore" }
  | {
      type: "historyFailed";
      operation: "refresh" | "loadMore";
      error: VersionError;
    }
  | {
      type: "historyLoaded";
      operation: "refresh" | "loadMore";
      snapshots: VersionSnapshot[];
      nextCursor?: string;
    }
  | { type: "selectionStarted"; target: VersionSelection }
  | { type: "selectionFailed" }
  | { type: "selectionShown"; target: VersionSelection; compareTo?: string }
  | { type: "restoreChanged"; restoring: boolean }
  | { type: "snapshotRenamed"; id: string; name?: string }
  | { type: "snapshotCreated"; snapshot: VersionSnapshot };

function mergeSnapshots(snapshots: VersionSnapshot[]) {
  return [
    ...new Map(snapshots.map((snapshot) => [snapshot.id, snapshot])).values(),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

/** Pure published-state transitions. Request ownership and editor effects stay in the controller. */
export function reduceVersioningState(
  state: VersioningState,
  event: VersioningEvent,
): VersioningState {
  if (event.type === "opened") {
    return {
      mode: "versions",
      capturedAt: event.capturedAt,
      showCurrentVersion: event.showCurrentVersion,
      restoring: event.restoring,
      displayed: { type: "current" },
      history: { status: "pending" },
    };
  }
  if (event.type === "closed") {
    return event.restoring
      ? { mode: "live", restoring: true }
      : { mode: "live" };
  }
  if (state.mode === "live") {
    if (event.type === "restoreChanged") {
      return event.restoring
        ? { mode: "live", restoring: true }
        : { mode: "live" };
    }
    return state;
  }
  switch (event.type) {
    case "historyStarted":
      return {
        ...state,
        mode: "versions",
        history: {
          status: "pending",
          operation: event.operation,
          data: state.history.data,
        },
      };
    case "historyFailed":
      return {
        ...state,
        mode: "versions",
        history: {
          status: "error",
          operation: event.operation,
          error: event.error,
          data: state.history.data,
        },
      };
    case "historyLoaded":
      return {
        ...state,
        mode: "versions",
        nextCursor: event.nextCursor,
        history: {
          status: "success",
          data: mergeSnapshots(
            event.operation === "refresh"
              ? event.snapshots
              : [...(state.history.data ?? []), ...event.snapshots],
          ),
        },
      };
    case "selectionStarted":
      return { ...state, pending: event.target };
    case "selectionFailed":
      return { ...state, pending: undefined };
    case "selectionShown":
      return {
        ...state,
        displayed: event.target,
        compareTo: event.compareTo,
        pending: undefined,
      };
    case "restoreChanged":
      return {
        ...state,
        restoring: event.restoring,
        pending: event.restoring ? undefined : state.pending,
      };
    case "snapshotRenamed":
      return {
        ...state,
        mode: "versions",
        history: {
          status: "success",
          data: (state.history.data ?? []).map((snapshot) =>
            snapshot.id === event.id
              ? { ...snapshot, name: event.name }
              : snapshot,
          ),
        },
      };
    case "snapshotCreated":
      return {
        ...state,
        mode: "versions",
        history: {
          status: "success",
          data: mergeSnapshots([
            event.snapshot,
            ...(state.history.data ?? []).filter(
              (snapshot) => snapshot.id !== event.snapshot.id,
            ),
          ]),
        },
      };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
