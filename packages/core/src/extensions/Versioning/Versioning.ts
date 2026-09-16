import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { normalizeToUserStore } from "../../user/index.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { scrollToFirstChange as scrollToFirstChangeIn } from "./scrollToFirstChange.js";
import type {
  LoadedVersioningList,
  VersionSnapshot,
  VersionSnapshotIdentifier,
  VersioningExtensionOptions,
  VersioningState,
  VersioningView,
} from "./types.js";
import { createVersioningPreview } from "./helpers.js";

export type * from "./types.js";
export { LOADING_PREVIEW_CLASS, LOADING_PREVIEW_DELAY_MS } from "./helpers.js";

/** Previewing and restoring both hold the editor read-only. */
function isReadOnly(state: VersioningState): boolean {
  return state.view.mode !== "live" || state.restoring;
}

export const VersioningExtension = createExtension(
  ({
    options: optionsOrFactory,
    editor,
  }: ExtensionOptions<
    | VersioningExtensionOptions
    | ((editor: BlockNoteEditor<any, any, any>) => VersioningExtensionOptions)
  >) => {
    const {
      endpoints: endpointsRaw,
      preview,
      getCurrentDocument,
      serializeCurrentContent,
      resolveUsers,
      scrollToFirstChange: scrollToFirstChangeEnabled = true,
    } = typeof optionsOrFactory === "function"
      ? optionsOrFactory(editor)
      : optionsOrFactory;

    const endpoints =
      typeof endpointsRaw === "function" ? endpointsRaw(editor) : endpointsRaw;
    // Capture the controller method so the restore branch has a callable type.
    const applyRestore = preview.applyRestore?.bind(preview);
    // With no resolver this is an empty store: `getUser` always misses, so the
    // view layer falls back to showing the raw ids from `VersionSnapshot.by`.
    const userStore = normalizeToUserStore(resolveUsers);
    const store = createStore<VersioningState>({
      list: { loaded: false },
      view: { mode: "live" },
      status: { type: "idle" },
      restoring: false,
    });

    /** Sync versioning's read-only restriction when preview or restore state changes. */
    function setStateSyncingReadOnly(
      update: (state: VersioningState) => VersioningState,
    ) {
      const wasReadOnly = isReadOnly(store.state);
      store.setState(update);
      if (wasReadOnly !== isReadOnly(store.state)) {
        editor
          .getExtension(ReadOnlyExtension)!
          .setReadOnly(isReadOnly(store.state), "versioning");
      }
    }

    function setView(view: VersioningView) {
      setStateSyncingReadOnly((state) => ({ ...state, view }));
    }

    /** The list request in flight, if any. See {@link list}. */
    let listing: Promise<LoadedVersioningList> | undefined;
    /** Bumped per request, so a superseded one doesn't clear a newer marker. */
    let listGeneration = 0;

    let mountSignal: AbortSignal | undefined;
    let historySession: AbortController | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    function cancelRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }

    function closeHistory() {
      cancelRefresh();
      historySession?.abort();
      historySession = undefined;
      listing = undefined;
      listGeneration++;
    }

    /** Best-effort refresh of an open history view; repeated requests coalesce. */
    function refresh(delayMs = 0): void {
      cancelRefresh();
      if (!historySession || mountSignal?.aborted) {
        return;
      }
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void (listing ?? refreshList()).catch((error: unknown) => {
          // Keep the existing list and surface unexpected failures to developers.
          // eslint-disable-next-line no-console
          console.error("Failed to refresh version history", error);
        });
      }, delayMs);
    }

    /**
     * Fetch the list, replacing any request already in flight as the one
     * callers of {@link list} will join.
     */
    function refreshList(): Promise<LoadedVersioningList> {
      const generation = ++listGeneration;
      const signal = mountSignal;
      const session = historySession?.signal;
      const request = (async () => {
        try {
          const { current, snapshots } = await endpoints.list();
          const loaded = {
            loaded: true as const,
            current,
            snapshots: [...snapshots].sort((a, b) => b.createdAt - a.createdAt),
          };
          if (signal?.aborted || session?.aborted) {
            return loaded;
          }
          if (listGeneration !== generation) {
            // A mutation started a newer request; return its result instead.
            if (listing) {
              return listing;
            }
            if (store.state.list.loaded) {
              return store.state.list;
            }
          }
          // Listing never touches `view`: the sidebar owns what is previewed,
          // and a refresh must not knock the user out of the version they're
          // reading.
          store.setState((state) => ({ ...state, list: loaded }));
          return loaded;
        } finally {
          // Clear before callers resume, so they cannot join a finished request.
          if (listGeneration === generation) {
            listing = undefined;
            if (!signal?.aborted) {
              syncStatus();
            }
          }
        }
      })();

      listing = request;
      syncStatus();
      return request;
    }

    function findSnapshot(
      id: VersionSnapshotIdentifier | undefined,
    ): VersionSnapshot | undefined {
      if (id === undefined) {
        return undefined;
      }
      const idResolved = typeof id === "object" ? id.id : id;
      const { list: versions } = store.state;
      if (!versions.loaded) {
        return undefined;
      }
      if (versions.current.id === idResolved) {
        return versions.current;
      }
      return versions.snapshots.find((snapshot) => snapshot.id === idResolved);
    }

    /** Snapshot lookup for callers that require a result. */
    function requireSnapshot(id: VersionSnapshotIdentifier): VersionSnapshot {
      const snapshot = findSnapshot(id);
      if (!snapshot) {
        throw new Error(
          `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
        );
      }
      return snapshot;
    }

    const versionPreview = createVersioningPreview({
      store,
      endpoints,
      preview,
      serializeCurrentContent,
      getSnapshot: findSnapshot,
      requireSnapshot,
      setView,
      onStatusChange: syncStatus,
      getEditorDOM: () => editor.domElement,
      scrollToFirstChangeEnabled,
    });

    function syncStatus() {
      // Preview loading takes precedence over a concurrent list request.
      const view = versionPreview.loadingPreview;
      store.setState((state) => ({
        ...state,
        status: view
          ? { type: "loading-preview", view }
          : listing !== undefined
            ? { type: "listing" }
            : { type: "idle" },
      }));
    }

    return {
      key: "versioning",
      mount({ signal }: { signal: AbortSignal }) {
        mountSignal = signal;
        return closeHistory;
      },
      store,
      userStore,
      /** Open history and fetch its list, joining an in-flight request if present. */
      list(): Promise<LoadedVersioningList> {
        historySession ??= new AbortController();
        return listing ?? refreshList();
      },
      /**
       * Request a best-effort refresh, optionally delayed in milliseconds.
       * Does nothing until list() opens history, or after exitPreview()/unmount.
       * Replaces a pending refresh and joins any list request already in flight.
       */
      refresh,

      getSnapshot(id: VersionSnapshotIdentifier | undefined) {
        return findSnapshot(id);
      },

      // Comparison is only offered when the preview controller can actually
      // render a diff (see PreviewController.supportsComparison). A getter so a
      // controller whose `supportsComparison` is itself dynamic (e.g. gated on
      // an opt-in diff extension that may be registered after this one) is read
      // lazily, not captured at init time.
      get canCompare() {
        return preview.supportsComparison !== false;
      },
      /**
       * Name the current version.
       */
      create: endpoints.create
        ? async (options?: {
            /** The name to give the current version. */
            name?: string;
          }): Promise<VersionSnapshot> => {
            const snapshot = await endpoints.create!(getCurrentDocument(), {
              name: options?.name,
            });
            // Re-list rather than patching optimistically: naming the current
            // version can turn it into a stored row (and shift what "current"
            // is), which only the backend can resolve.
            await refreshList();
            return snapshot;
          }
        : undefined,
      // Both the backend and the preview controller must support restore.
      restore:
        endpoints.restore && applyRestore
          ? async (id: VersionSnapshotIdentifier) => {
              const snapshot = requireSnapshot(id);
              cancelRefresh();
              // Prevent edits while the live document is about to be replaced.
              setStateSyncingReadOnly((state) => ({
                ...state,
                restoring: true,
              }));
              try {
                const snapshotContent = await endpoints.restore!(
                  getCurrentDocument(),
                  snapshot,
                );
                versionPreview.exitPreview();
                applyRestore(snapshotContent);
                // The restore has succeeded. Apply it even if refreshing the
                // sidebar fails, keeping the read-only hold until both finish.
                try {
                  await refreshList();
                } finally {
                  if (endpoints.refreshAfterRestoreMs !== undefined) {
                    refresh(endpoints.refreshAfterRestoreMs);
                  }
                }
                return snapshotContent;
              } finally {
                setStateSyncingReadOnly((state) => ({
                  ...state,
                  restoring: false,
                }));
              }
            }
          : undefined,
      rename: endpoints.rename
        ? async (
            id: VersionSnapshotIdentifier,
            name?: string,
          ): Promise<void> => {
            const snapshot = requireSnapshot(id);
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
            const snapshot = requireSnapshot(id);
            await endpoints.remove!(snapshot);
            const loaded = await refreshList();
            // Only when the version is really gone: on continuous-history
            // backends removing a version just drops its name, and the row
            // stays previewable. If it is gone and was the one previewed (or
            // the baseline it was diffed against), leave the preview so the
            // editor isn't showing, or comparing against, a version that no
            // longer exists.
            const stillListed =
              loaded.current.id === snapshot.id ||
              loaded.snapshots.some((s) => s.id === snapshot.id);
            const { view } = store.state;
            const previewingRemoved =
              view.mode === "snapshot" && view.snapshotId === snapshot.id;
            const comparingToRemoved =
              view.mode !== "live" && view.compareToId === snapshot.id;
            if (!stillListed && (previewingRemoved || comparingToRemoved)) {
              versionPreview.exitPreview();
            }
          }
        : undefined,
      previewSnapshot(
        this: void,
        ...args: Parameters<typeof versionPreview.previewSnapshot>
      ) {
        return versionPreview.previewSnapshot(...args);
      },
      previewCurrentVersion: serializeCurrentContent
        ? (...args: Parameters<typeof versionPreview.previewCurrentVersion>) =>
            versionPreview.previewCurrentVersion(...args)
        : undefined,
      exitPreview(this: void) {
        closeHistory();
        versionPreview.exitPreview();
      },
      /**
       * Scroll the first change of the rendered diff into view. Called
       * automatically after entering a preview unless
       * {@link VersioningExtensionOptions.scrollToFirstChange} is `false`;
       * exposed so a host can trigger it itself.
       *
       * @returns whether a change was found to scroll to.
       */
      scrollToFirstChange() {
        return scrollToFirstChangeIn(editor.domElement);
      },
    } as const;
  },
);
