import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

/**
 * Represents a single snapshot of a document's history, including metadata and content information.
 * Snapshots are used for versioning and can be created, listed, restored, and previewed through the
 * {@link VersioningEndpoints}.
 */
export interface VersionSnapshot {
  /**
   * The unique identifier for the snapshot.
   */
  id: string;

  /**
   * The name of the snapshot.
   */
  name?: string;

  /**
   * The timestamp when the snapshot was created (unix timestamp).
   */
  createdAt: number;

  /**
   * The timestamp when the snapshot was last updated (unix timestamp).
   */
  updatedAt: number;

  /**
   * An optional secondary label for the snapshot, which can display additional information such as the author or a custom description.
   * This is for display purposes only and is not used for any logic in the versioning system.
   */
  secondaryLabel?: string;

  /**
   * The ID of the previous snapshot that this snapshot was restored from.
   */
  restoredFromSnapshotId?: string;
}

/**
 * Identifier for a single {@link VersionSnapshot}, either as a single identifier or the whole reference
 */
export type VersionSnapshotIdentifier = string | Pick<VersionSnapshot, "id">;

/**
 * Sentinel id used for the live ("current") document when it is previewed as a
 * read-only diff against a snapshot (see {@link VersioningExtension.previewCurrentVersion}).
 *
 * It is not a real snapshot id — it never appears in `store.state.snapshots` —
 * but it is stored in `previewedSnapshotId` so the UI can mark the "Current"
 * row as selected while still disabling editing (which is gated on
 * `previewedSnapshotId === undefined`).
 */
export const CURRENT_VERSION_ID = "current";

/**
 * Defines the contract for versioning operations, including listing snapshots,
 * creating new snapshots, restoring to a snapshot, fetching snapshot content,
 * and updating snapshot names. Implementations of this interface provide the
 * necessary backend functionality to support versioning features in the editor.
 *
 * @typeParam I - The type of the current document state passed to `create` and
 *   `restore` (e.g. `Y.Type` for Yjs-backed implementations).
 * @typeParam O - The type of serialised snapshot content returned by
 *   `getContent` and `restore` (e.g. `Uint8Array`).
 * @typeParam A - The type of optional attribution data returned by
 *   `getAttributions` (e.g. `Y.ContentMap` for Yjs-backed implementations).
 */
export interface VersioningEndpoints<I = any, O = any, A = any> {
  /**
   * List all snapshots for this document, sorted newest-first by
   * {@link VersionSnapshot.createdAt}.
   */
  list: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot for this document with the current content.
   *
   * @note if not provided, the UI will not offer a way to save a new snapshot.
   * This is appropriate for backends that record continuous history rather than
   * discrete, user-created snapshots (e.g. YHub's activity timeline).
   */
  create?: (
    fragment: I,
    options?: {
      /**
       * The optional name for this snapshot.
       */
      name?: string;
      /**
       * The ID of the snapshot this one was restored from, if applicable.
       */
      restoredFromSnapshot?: VersionSnapshot;
    },
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the current document to the provided snapshot. Implementations
   * should create any backup / audit snapshots they need before returning.
   *
   * @param doc The current document state (used by some implementations to
   *   create a backup snapshot before restoring).
   * @param snapshot The identifier of the snapshot to restore.
   *
   * @note if not provided, the UI will not allow the user to restore a
   * snapshot.
   */
  restore?: (doc: I, snapshot: VersionSnapshot) => Promise<O>;
  /**
   * Fetch the contents of a snapshot. Used for previewing before restore.
   */
  getContent: (snapshot: VersionSnapshot) => Promise<O>;
  /**
   * Fetch optional attribution data describing *who* authored each change and
   * *when*, for the diff between a snapshot and the version it is compared
   * against. This is rendered as additional diff information (e.g. author and
   * timestamp tooltips on inserted/deleted content) when previewing a version.
   *
   * @param id          - The identifier of the snapshot being previewed.
   * @param compareTo - When previewing a diff, the identifier of the baseline
   *   snapshot the diff is computed against. Implementations may need both ends
   *   of the range to resolve attributions.
   *
   * @note if not provided, version previews still render the content diff, but
   * without author/timestamp attribution information.
   */
  getAttributions?: (
    snapshot: VersionSnapshot,
    compareTo?: VersionSnapshot,
  ) => Promise<A>;
  /**
   * Update the name of a snapshot.
   *
   * @note if not provided, the UI will not allow the user to update the name.
   */
  updateSnapshotName?: (
    snapshot: VersionSnapshot,
    name?: string,
  ) => Promise<void>;
}

/**
 * A factory function for the endpoints to receive a reference to the editor
 */
export type VersioningEndpointsFactory<I = any, O = any, A = any> = (
  editor: BlockNoteEditor<any, any, any>,
) => VersioningEndpoints<I, O, A>;

/**
 * Controls how snapshot previews and restores are rendered in the editor.
 *
 * This is the integration point for framework-specific rendering (e.g. Yjs).
 * The base {@link VersioningExtension} fetches content from the endpoints and
 * delegates rendering to the preview controller.
 *
 * @typeParam O - The type of serialised snapshot content (must match the `O`
 *   type of the corresponding {@link VersioningEndpoints}).
 * @typeParam A - The type of optional attribution data (must match the `A`
 *   type of the corresponding {@link VersioningEndpoints}).
 */
export interface PreviewController<O = any, A = any> {
  /**
   * Whether this controller can render a diff between two versions (i.e.
   * whether {@link enterPreview} does anything meaningful with
   * `compareToContent`). Defaults to `true`.
   *
   * Set to `false` for backends that can only show a version on its own — e.g.
   * the Yjs v13 adapter, which forks the document to a snapshot but has no way
   * to diff it against another version. The extension surfaces this as
   * {@link VersioningExtension.canCompareVersions} so the UI can hide the
   * comparison affordances entirely.
   */
  supportsComparison?: boolean;
  /**
   * Enter preview mode, showing the given snapshot content in the editor.
   *
   * @param snapshotContent     - The content of the snapshot to preview.
   * @param compareToContent    - When provided, the editor should show a diff
   *   between `compareToContent` (the baseline) and `snapshotContent`.
   * @param attributions        - Optional attribution data for the diff,
   *   describing who authored each change and when. Only meaningful alongside
   *   `compareToContent`, and rendered as additional diff information.
   */
  enterPreview: (
    snapshotContent: O,
    compareToContent?: O,
    attributions?: A,
  ) => void;
  /**
   * Exit preview mode and resume normal editing.
   */
  exitPreview: () => void;
  /**
   * Apply the restored snapshot content to the live document.
   *
   * Called after {@link VersioningEndpoints.restore} returns, *after* preview
   * mode has already been exited.
   */
  applyRestore: (snapshotContent: O) => void;
}

/** Sort snapshots newest-first by creation time. */
export function sortSnapshotsNewestFirst(
  snapshots: VersionSnapshot[],
): VersionSnapshot[] {
  return [...snapshots].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Options accepted by the {@link VersioningExtension}.
 *
 * @typeParam I - The type of the current document state.
 * @typeParam O - The type of serialised snapshot content.
 * @typeParam A - The type of optional attribution data.
 */
export type VersioningExtensionOptions<I = any, O = any, A = any> = {
  /**
   * Backend storage for snapshots.
   */
  endpoints: VersioningEndpoints<I, O, A> | VersioningEndpointsFactory<I, O, A>;
  /**
   * Controls how snapshot previews and restores are rendered in the editor.
   */
  preview: PreviewController<O, A>;
  /**
   * Returns the current document state. This value is passed to
   * {@link VersioningEndpoints.create} and {@link VersioningEndpoints.restore}.
   */
  getCurrentState: () => I;
  /**
   * Returns the *serialized* content of the live document, in the same output
   * format that {@link VersioningEndpoints.getContent} returns. Used to render
   * a read-only diff of the live document against a snapshot (see
   * {@link VersioningExtension.previewCurrentVersion}).
   *
   * @note if not provided, the UI cannot offer a "Current version" diff.
   * This is adapter-specific because serialization differs by backend (e.g.
   * `Block[]` for in-memory, a `Uint8Array` Yjs update for Yjs-backed editors).
   */
  getCurrentContent?: () => O | Promise<O>;
};

function snapshotNotFoundError(
  id: VersionSnapshotIdentifier | undefined,
): never {
  const idResolved = typeof id === "object" ? id.id : id;
  throw new Error(`Snapshot not found: ${idResolved}`);
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
      getCurrentState,
      getCurrentContent,
    } = typeof optionsOrFactory === "function"
      ? optionsOrFactory(editor)
      : optionsOrFactory;

    const endpoints =
      typeof endpointsRaw === "function" ? endpointsRaw(editor) : endpointsRaw;
    const store = createStore<{
      snapshots: VersionSnapshot[];
      /**
       * The id of the version currently shown in the editor (the "new" side of
       * a diff). `undefined` means the live, editable document. Can be
       * {@link CURRENT_VERSION_ID} when previewing the live document as a
       * read-only diff against a snapshot.
       */
      previewedSnapshotId?: string;
      /**
       * The id of the snapshot the preview is being diffed against (the
       * "baseline" / old side). `undefined` when not showing a diff. Used to
       * render the "Comparing to" indicator in the sidebar.
       */
      compareToSnapshotId?: string;
    }>({
      snapshots: [],
      previewedSnapshotId: undefined,
      compareToSnapshotId: undefined,
    });

    const getSnapshot = (id: VersionSnapshotIdentifier | undefined) => {
      const idResolved = typeof id === "object" ? id.id : id;
      return store.state.snapshots.find(
        (snapshot) => snapshot.id === idResolved,
      );
    };

    const updateSnapshots = async () => {
      const snapshots = sortSnapshotsNewestFirst(await endpoints.list());
      store.setState((state) => ({
        ...state,
        snapshots,
      }));

      return snapshots;
    };

    const previewSnapshot = async (
      id: VersionSnapshotIdentifier,
      previewOptions?: {
        /**
         * When set, the preview shows a diff against this snapshot (typically the
         * chronologically previous version in the history list).
         */
        compareTo?: VersionSnapshotIdentifier;
      },
    ) => {
      const snapshot = getSnapshot(id);

      if (!snapshot) {
        snapshotNotFoundError(id);
      }

      const compareToSnapshot = previewOptions?.compareTo
        ? getSnapshot(previewOptions.compareTo)
        : undefined;

      store.setState((state) => ({
        ...state,
        previewedSnapshotId: snapshot.id,
        compareToSnapshotId: compareToSnapshot?.id,
      }));

      let compareToContent: unknown;
      let attributions: unknown;
      if (compareToSnapshot) {
        compareToContent = await endpoints.getContent(compareToSnapshot);
        // Attributions describe the diff between the baseline and this
        // snapshot, so they're only meaningful when comparing against another
        // version. Fetching them is optional: previews still render the content
        // diff without author/timestamp information when unavailable.
        if (endpoints.getAttributions) {
          attributions = await endpoints.getAttributions(
            snapshot,
            compareToSnapshot,
          );
        }
      }

      const snapshotContent = await endpoints.getContent(snapshot);
      preview.enterPreview(snapshotContent, compareToContent, attributions);
    };

    /**
     * Preview the live ("current") document as a read-only diff against a
     * snapshot baseline. Unlike {@link previewSnapshot}, the "new" side of the
     * diff is the live document — serialised via `getCurrentContent` — rather
     * than a stored snapshot. The editor becomes non-editable while previewing
     * (editing is gated on `previewedSnapshotId === undefined`).
     */
    const previewCurrentVersion = async (previewOptions?: {
      /**
       * The snapshot to diff the live document against (the baseline). When
       * omitted, the live document is shown without a diff.
       */
      compareTo?: VersionSnapshotIdentifier;
    }) => {
      if (!getCurrentContent) {
        throw new Error(
          "previewCurrentVersion requires `getCurrentContent` to be provided " +
            "to the VersioningExtension options.",
        );
      }

      const compareToSnapshot = previewOptions?.compareTo
        ? getSnapshot(previewOptions.compareTo)
        : undefined;

      store.setState((state) => ({
        ...state,
        previewedSnapshotId: CURRENT_VERSION_ID,
        compareToSnapshotId: compareToSnapshot?.id,
      }));

      let compareToContent: unknown;
      let attributions: unknown;
      if (compareToSnapshot) {
        compareToContent = await endpoints.getContent(compareToSnapshot);
        if (endpoints.getAttributions) {
          // Synthesise a snapshot for the live document so timestamp-based
          // backends (e.g. YHub) resolve the changeset window up to "now".
          const currentSnapshot: VersionSnapshot = {
            id: CURRENT_VERSION_ID,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          attributions = await endpoints.getAttributions(
            currentSnapshot,
            compareToSnapshot,
          );
        }
      }

      const currentContent = await getCurrentContent();
      preview.enterPreview(currentContent, compareToContent, attributions);
    };

    const exitPreview = () => {
      store.setState((state) => ({
        ...state,
        previewedSnapshotId: undefined,
        compareToSnapshotId: undefined,
      }));
      preview.exitPreview();
    };

    return {
      key: "versioning",
      store,
      listSnapshots: async (): Promise<VersionSnapshot[]> => {
        return await updateSnapshots();
      },
      // Comparison is only offered when the preview controller can actually
      // render a diff (see PreviewController.supportsComparison).
      canCompareVersions: preview.supportsComparison !== false,
      canCreateSnapshot: endpoints.create !== undefined,
      createSnapshot: endpoints.create
        ? async (options?: {
            /**
             * The optional name for this snapshot.
             */
            name?: string;
            /**
             * The ID of the snapshot this one was restored from, if applicable.
             */
            restoredFromSnapshot?: VersionSnapshotIdentifier;
          }): Promise<VersionSnapshot> => {
            const snapshot = await endpoints.create!(getCurrentState(), {
              name: options?.name,
              restoredFromSnapshot: getSnapshot(options?.restoredFromSnapshot),
            });
            // Show the new version immediately. Some backends (e.g. YHub) build
            // their version list from an activity timeline that lags a beat
            // behind the create, so waiting on a re-list would leave the UI
            // briefly stale.
            store.setState((state) => ({
              ...state,
              snapshots: sortSnapshotsNewestFirst([
                ...state.snapshots,
                snapshot,
              ]),
            }));
            // Reconcile with the backend's `list()` — it owns the "current
            // version" entry and any server-assigned metadata. If the refreshed
            // list doesn't include the just-created version yet (indexing lag),
            // keep the optimistic entry so it never flickers out.
            const listed = await endpoints.list();
            store.setState((state) => ({
              ...state,
              snapshots: sortSnapshotsNewestFirst(
                listed.some((s) => s.id === snapshot.id)
                  ? listed
                  : [...listed, snapshot],
              ),
            }));
            return snapshot;
          }
        : undefined,
      canRestoreSnapshot: endpoints.restore !== undefined,
      restoreSnapshot: endpoints.restore
        ? async (id: VersionSnapshotIdentifier) => {
            exitPreview();
            const snapshot = getSnapshot(id);

            if (!snapshot) {
              snapshotNotFoundError(id);
            }
            const snapshotContent = await endpoints.restore!(
              getCurrentState(),
              snapshot,
            );
            preview.applyRestore(snapshotContent);
            await updateSnapshots();
            return snapshotContent;
          }
        : undefined,
      canUpdateSnapshotName: endpoints.updateSnapshotName !== undefined,
      updateSnapshotName: endpoints.updateSnapshotName
        ? async (
            id: VersionSnapshotIdentifier,
            name?: string,
          ): Promise<void> => {
            const snapshot = getSnapshot(id);
            if (!snapshot) {
              snapshotNotFoundError(id);
            }
            await endpoints.updateSnapshotName!(snapshot, name);
            store.setState((state) => ({
              ...state,
              snapshots: state.snapshots.map((s) =>
                s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
              ),
            }));
          }
        : undefined,
      previewSnapshot,
      canPreviewCurrentVersion: getCurrentContent !== undefined,
      previewCurrentVersion: getCurrentContent
        ? previewCurrentVersion
        : undefined,
      exitPreview,
    } as const;
  },
);
