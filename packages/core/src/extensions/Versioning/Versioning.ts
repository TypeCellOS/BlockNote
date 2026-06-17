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

export type CreateSnapshotOptions = {
  /**
   * The optional name for this snapshot.
   */
  name?: string;
  /**
   * The ID of the snapshot this one was restored from, if applicable.
   */
  restoredFromSnapshotId?: string;
};

export type PreviewSnapshotOptions = {
  /**
   * When set, the preview shows a diff against this snapshot (typically the
   * chronologically previous version in the history list).
   */
  compareTo?: string;
};

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
 */
export interface VersioningEndpoints<I = any, O = any> {
  /**
   * List all snapshots for this document, sorted newest-first by
   * {@link VersionSnapshot.createdAt}.
   */
  list: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot for this document with the current content.
   */
  create: (
    fragment: I,
    options?: CreateSnapshotOptions,
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the current document to the provided snapshot. Implementations
   * should create any backup / audit snapshots they need before returning.
   *
   * @param doc  - The current document state (used by some implementations to
   *   create a backup snapshot before restoring).
   * @param id   - The identifier of the snapshot to restore.
   *
   * @note if not provided, the UI will not allow the user to restore a
   * snapshot.
   */
  restore?: (doc: I, id: string) => Promise<O>;
  /**
   * Fetch the contents of a snapshot. Used for previewing before restore.
   */
  getContent: (id: string) => Promise<O>;
  /**
   * Update the name of a snapshot.
   *
   * @note if not provided, the UI will not allow the user to update the name.
   */
  updateSnapshotName?: (id: string, name?: string) => Promise<void>;
}

/**
 * Controls how snapshot previews and restores are rendered in the editor.
 *
 * This is the integration point for framework-specific rendering (e.g. Yjs).
 * The base {@link VersioningExtension} fetches content from the endpoints and
 * delegates rendering to the preview controller.
 *
 * @typeParam O - The type of serialised snapshot content (must match the `O`
 *   type of the corresponding {@link VersioningEndpoints}).
 */
export interface PreviewController<O = any> {
  /**
   * Enter preview mode, showing the given snapshot content in the editor.
   *
   * @param snapshotContent     - The content of the snapshot to preview.
   * @param compareToContent    - When provided, the editor should show a diff
   *   between `compareToContent` (the baseline) and `snapshotContent`.
   */
  enterPreview: (snapshotContent: O, compareToContent?: O) => void;
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
 */
export type VersioningExtensionOptions<I = any, O = any> = {
  /**
   * Backend storage for snapshots.
   */
  endpoints: VersioningEndpoints<I, O>;
  /**
   * Controls how snapshot previews and restores are rendered in the editor.
   */
  preview: PreviewController<O>;
  /**
   * Returns the current document state. This value is passed to
   * {@link VersioningEndpoints.create} and {@link VersioningEndpoints.restore}.
   */
  getCurrentState: () => I;
};

export const VersioningExtension = createExtension(
  ({
    options: optionsOrFactory,
    editor,
  }: ExtensionOptions<
    | VersioningExtensionOptions
    | ((editor: BlockNoteEditor<any, any, any>) => VersioningExtensionOptions)
  >) => {
    const { endpoints, preview, getCurrentState } =
      typeof optionsOrFactory === "function"
        ? optionsOrFactory(editor)
        : optionsOrFactory;
    const store = createStore<{
      snapshots: VersionSnapshot[];
      previewedSnapshotId?: string;
    }>({
      snapshots: [],
      previewedSnapshotId: undefined,
    });

    const updateSnapshots = async () => {
      const snapshots = sortSnapshotsNewestFirst(await endpoints.list());
      store.setState((state) => ({
        ...state,
        snapshots,
      }));
    };

    const previewSnapshot = async (
      id: string,
      previewOptions?: PreviewSnapshotOptions,
    ) => {
      store.setState((state) => ({
        ...state,
        previewedSnapshotId: id,
      }));

      let compareToContent: unknown;
      if (previewOptions?.compareTo) {
        compareToContent = await endpoints.getContent(previewOptions.compareTo);
      }

      const snapshotContent = await endpoints.getContent(id);
      preview.enterPreview(snapshotContent, compareToContent);
    };

    const exitPreview = () => {
      store.setState((state) => ({
        ...state,
        previewedSnapshotId: undefined,
      }));
      preview.exitPreview();
    };

    return {
      key: "versioning",
      store,
      listSnapshots: async (): Promise<VersionSnapshot[]> => {
        await updateSnapshots();
        return store.state.snapshots;
      },
      createSnapshot: async (
        options?: CreateSnapshotOptions,
      ): Promise<VersionSnapshot> => {
        const snapshot = await endpoints.create(getCurrentState(), options);
        store.setState((state) => ({
          ...state,
          snapshots: sortSnapshotsNewestFirst([...state.snapshots, snapshot]),
        }));
        return snapshot;
      },
      canRestoreSnapshot: endpoints.restore !== undefined,
      restoreSnapshot: endpoints.restore
        ? async (id: string) => {
            exitPreview();
            const snapshotContent = await endpoints.restore!(
              getCurrentState(),
              id,
            );
            preview.applyRestore(snapshotContent);
            await updateSnapshots();
            return snapshotContent;
          }
        : undefined,
      canUpdateSnapshotName: endpoints.updateSnapshotName !== undefined,
      updateSnapshotName: endpoints.updateSnapshotName
        ? async (id: string, name?: string): Promise<void> => {
            await endpoints.updateSnapshotName!(id, name);
            store.setState((state) => ({
              ...state,
              snapshots: state.snapshots.map((s) =>
                s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
              ),
            }));
          }
        : undefined,
      previewSnapshot,
      exitPreview,
    } as const;
  },
);
