import type { Store } from "../../util/Store.js";
import { findSnapshot } from "./state.js";
import type {
  VersioningEndpoints,
  VersionSnapshotIdentifier,
  VersioningState,
  VersionSnapshot,
} from "./types.js";

/**
 * The mutation commands: create, restore, rename and remove. Each composes a
 * backend call with a list refresh and, where the result affects the screen,
 * an exit from preview. They know nothing about supersession or status — that
 * is the preview session's and the root's business.
 */
export function createVersioningCommands({
  store,
  endpoints,
  getCurrentDocument,
  applyRestore,
  refreshList,
  exitPreview,
}: {
  store: Store<VersioningState>;
  endpoints: VersioningEndpoints;
  getCurrentDocument: () => any;
  applyRestore?: (content: any) => void;
  refreshList: () => Promise<any>;
  exitPreview: () => void;
}) {
  return {
    create: endpoints.create
      ? async (options?: { name?: string }): Promise<VersionSnapshot> => {
          const snapshot = await endpoints.create!(getCurrentDocument(), {
            name: options?.name,
          });
          // Naming does not advance the frozen history shown by the sidebar.
          // Reopening the sidebar lists again and replaces this session-local
          // view with the backend's authoritative rows.
          if (!store.state.list.loaded) {
            await refreshList();
          }
          store.setState((state) =>
            state.list.loaded
              ? {
                  ...state,
                  list: {
                    loaded: true,
                    current: snapshot,
                    snapshots: state.list.snapshots.filter(
                      (stored) => stored.id !== snapshot.id,
                    ),
                  },
                }
              : state,
          );
          return snapshot;
        }
      : undefined,
    restore:
      endpoints.restore && applyRestore
        ? async (id: VersionSnapshotIdentifier) => {
            const snapshot = findSnapshot(store.state.list, id);
            if (snapshot === undefined) {
              throw new Error(
                `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
              );
            }
            // Prevent edits while the live document is about to be replaced.
            store.setState((state) => ({ ...state, restoring: true }));
            try {
              const snapshotContent = await endpoints.restore!(
                getCurrentDocument(),
                snapshot,
              );
              exitPreview();
              applyRestore(snapshotContent);
              // Re-list so the sidebar reflects the restore. Backends whose
              // history settles asynchronously may need a reopen to show
              // the newest rows.
              await refreshList();
              return snapshotContent;
            } finally {
              store.setState((state) => ({ ...state, restoring: false }));
            }
          }
        : undefined,
    rename: endpoints.rename
      ? async (id: VersionSnapshotIdentifier, name?: string): Promise<void> => {
          const snapshot = findSnapshot(store.state.list, id);
          if (snapshot === undefined) {
            throw new Error(
              `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
            );
          }
          await endpoints.rename!(snapshot, name);
          // Patch the name in place: a rename changes nothing else about the
          // list, so re-listing would only cost a round-trip and a flicker.
          store.setState((state) => {
            if (!state.list.loaded) {
              return state;
            }
            const patch = (s: VersionSnapshot) =>
              s.id === snapshot.id ? { ...s, name } : s;
            return {
              ...state,
              list: {
                loaded: true,
                current: patch(state.list.current),
                snapshots: state.list.snapshots.map(patch),
              },
            };
          });
        }
      : undefined,
    remove: endpoints.remove
      ? async (id: VersionSnapshotIdentifier): Promise<void> => {
          const snapshot = findSnapshot(store.state.list, id);
          if (snapshot === undefined) {
            throw new Error(
              `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
            );
          }
          await endpoints.remove!(snapshot);
          await refreshList();
          // The removed row may survive as unnamed history; leave only if
          // what is on screen (or what it is diffed against) is really gone
          // (`exitPreview` no-ops when live).
          const { view } = store.state;
          const gone = (shown: string | undefined) =>
            shown !== undefined && !findSnapshot(store.state.list, shown);
          if (
            view.mode !== "live" &&
            (gone(view.mode === "snapshot" ? view.snapshotId : undefined) ||
              gone(view.compareToId))
          ) {
            exitPreview();
          }
        }
      : undefined,
  };
}
