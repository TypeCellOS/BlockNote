import { configureYProsemirror, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";

import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../../editor/BlockNoteExtension.js";
import { findTypeInOtherYdoc } from "../ForkYDoc.js";

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
   * Additional metadata about the snapshot.
   */
  meta: {
    /**
     * The user IDs associated with the snapshot.
     */
    userIds?: string[];
    /**
     * The ID of the previous snapshot that this snapshot was restored from.
     */
    restoredFromSnapshotId?: string;
    /**
     * Additional custom metadata. Snapshot content is not stored here — use
     * {@link VersioningEndpoints.fetchSnapshotContent} instead.
     */
    [key: string]: unknown;
  };
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

export interface VersioningEndpoints {
  /**
   * List all snapshots for this document, sorted newest-first by
   * {@link VersionSnapshot.createdAt}.
   */
  listSnapshots: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot for this document with the current content.
   */
  createSnapshot: (
    fragment: Y.Type,
    options?: CreateSnapshotOptions,
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the current document to the provided snapshot. Implementations
   * should create any backup / audit snapshots they need before returning.
   *
   * @note if not provided, the UI will not allow the user to restore a
   * snapshot.
   * @returns the binary contents of the `Y.Doc` to apply to the live document.
   */
  restoreSnapshot?: (fragment: Y.Type, id: string) => Promise<Uint8Array>;
  /**
   * Fetch the contents of a snapshot. Used for previewing before restore.
   *
   * @returns the binary contents of the `Y.Doc` of the snapshot.
   */
  fetchSnapshotContent: (id: string) => Promise<Uint8Array>;
  /**
   * Update the name of a snapshot.
   *
   * @note if not provided, the UI will not allow the user to update the name.
   */
  updateSnapshotName?: (id: string, name?: string) => Promise<void>;
}

export type VersioningExtensionOptions = {
  /**
   * Backend storage for snapshots.
   */
  endpoints: VersioningEndpoints;
  /**
   * The Yjs type to version. When omitted, the fragment from the active
   * `ySync` plugin is used (requires collaboration / `YSyncExtension`).
   */
  fragment?: Y.Type;
};

/** Sort snapshots newest-first by creation time. */
export function sortSnapshotsNewestFirst(
  snapshots: VersionSnapshot[],
): VersionSnapshot[] {
  return [...snapshots].sort((a, b) => b.createdAt - a.createdAt);
}

export const VersioningExtension = createExtension(
  ({
    editor,
    options: { endpoints, fragment: fragmentOption },
  }: ExtensionOptions<VersioningExtensionOptions>) => {
    const getFragment = (): Y.Type => {
      if (fragmentOption) {
        return fragmentOption;
      }
      const ytype = ySyncPluginKey.getState(editor.prosemirrorState)?.ytype;
      if (!ytype) {
        throw new Error(
          "VersioningExtension requires a `fragment` option, or an editor with YSync configured.",
        );
      }
      return ytype;
    };

    const store = createStore<{
      snapshots: VersionSnapshot[];
      previewedSnapshotId?: string;
    }>({
      snapshots: [],
      previewedSnapshotId: undefined,
    });

    const updateSnapshots = async () => {
      const snapshots = sortSnapshotsNewestFirst(
        await endpoints.listSnapshots(),
      );
      store.setState((state) => ({
        ...state,
        snapshots,
      }));
    };

    const applySnapshotToLiveDoc = (snapshotContent: Uint8Array) => {
      const fragment = getFragment();
      Y.applyUpdateV2(fragment.doc!, snapshotContent);
    };

    const previewSnapshot = async (
      id: string,
      previewOptions?: PreviewSnapshotOptions,
    ) => {
      const fragment = getFragment();

      store.setState((state) => ({
        ...state,
        previewedSnapshotId: id,
      }));

      let prevSnapshot: { fragment: Y.Type } | undefined;
      if (previewOptions?.compareTo) {
        const compareToSnapshotContent = await endpoints.fetchSnapshotContent(
          previewOptions.compareTo,
        );
        const compareToDoc = new Y.Doc({ isSuggestionDoc: true });
        Y.applyUpdateV2(compareToDoc, compareToSnapshotContent);
        prevSnapshot = {
          fragment: findTypeInOtherYdoc(fragment, compareToDoc),
        };
      }

      const snapshotContent = await endpoints.fetchSnapshotContent(id);
      const doc = new Y.Doc();
      Y.applyUpdateV2(doc, snapshotContent);
      editor.exec(
        configureYProsemirror({
          ytype: findTypeInOtherYdoc(fragment, doc),
          attributionManager: prevSnapshot
            ? Y.createAttributionManagerFromDiff(
                prevSnapshot.fragment.doc!,
                doc,
              )
            : undefined,
        }),
      );
    };

    const exitPreview = () => {
      store.setState((state) => ({
        ...state,
        previewedSnapshotId: undefined,
      }));
      ySyncPluginKey.getState(editor.prosemirrorState)?.resumeSync();
    };

    return {
      key: "versioning",
      store,
      mount: () => {
        void updateSnapshots();
      },
      listSnapshots: async (): Promise<VersionSnapshot[]> => {
        await updateSnapshots();
        return store.state.snapshots;
      },
      createSnapshot: async (
        options?: CreateSnapshotOptions,
      ): Promise<VersionSnapshot> => {
        const snapshot = await endpoints.createSnapshot(getFragment(), options);
        await updateSnapshots();
        return snapshot;
      },
      canRestoreSnapshot: endpoints.restoreSnapshot !== undefined,
      restoreSnapshot: endpoints.restoreSnapshot
        ? async (id: string): Promise<Uint8Array> => {
            exitPreview();
            const snapshotContent = await endpoints.restoreSnapshot!(
              getFragment(),
              id,
            );
            applySnapshotToLiveDoc(snapshotContent);
            await updateSnapshots();
            return snapshotContent;
          }
        : undefined,
      canUpdateSnapshotName: endpoints.updateSnapshotName !== undefined,
      updateSnapshotName: endpoints.updateSnapshotName
        ? async (id: string, name?: string): Promise<void> => {
            await endpoints.updateSnapshotName!(id, name);
            await updateSnapshots();
          }
        : undefined,
      previewSnapshot,
      exitPreview,
    } as const;
  },
);
