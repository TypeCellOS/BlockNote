import * as Y from "yjs";

import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import {
  findTypeInOtherYdoc,
  ForkYDocExtension,
} from "../Collaboration/ForkYDoc.js";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";

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
     * Additional metadata about the snapshot.
     */
    [key: string]: unknown;
  };
}

export interface VersioningEndpoints {
  /**
   * List all created snapshots for this document.
   */
  listSnapshots: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot for this document with the current content.
   */
  createSnapshot: (
    fragment: Y.XmlFragment,
    /**
     * The optional name for this snapshot.
     */
    name?: string,
    /**
     * The ID of the previous snapshot that this snapshot was restored from.
     */
    restoredFromSnapshotId?: string,
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the current document to the provided snapshot ID. This should also
   * append a new snapshot to the list with the reverted changes, and may
   * include additional actions like appending a backup snapshot with the
   * document content, just before reverting.
   *
   * @note if not provided, the UI will not allow the user to restore a
   * snapshot.
   * @returns the binary contents of the `Y.Doc` of the snapshot.
   */
  restoreSnapshot?: (
    fragment: Y.XmlFragment,
    id: string,
  ) => Promise<Uint8Array>;
  /**
   * Fetch the contents of a snapshot. This is useful for previewing a
   * snapshot before choosing to revert it.
   *
   * @returns the binary contents of the `Y.Doc` of the snapshot.
   */
  fetchSnapshotContent: (
    /**
     * The id of the snapshot to fetch the contents of.
     */
    id: string,
  ) => Promise<Uint8Array>;
  /**
   * Update the name of a snapshot.
   *
   * @note if not provided, the UI will not allow the user to update the name
   */
  updateSnapshotName?: (id: string, name?: string) => Promise<void>;
}

export const VersioningExtension = createExtension(
  ({
    editor,
    options: { endpoints, fragment },
  }: ExtensionOptions<{
    /**
     * There are different endpoints that need to be provided to implement the versioning API.
     */
    endpoints: VersioningEndpoints;
    fragment: Y.XmlFragment;
  }>) => {
    const store = createStore<{
      snapshots: VersionSnapshot[];
      selectedSnapshotId?: string;
    }>({
      snapshots: [],
      selectedSnapshotId: undefined,
    });

    const applySnapshot = (snapshotContent: Uint8Array) => {
      const yDoc = new Y.Doc();
      Y.applyUpdateV2(yDoc, snapshotContent);

      // Find the fragment within the newly restored document to then apply
      const restoreFragment = findTypeInOtherYdoc(fragment, yDoc);

      const pmDoc = yXmlFragmentToProseMirrorRootNode(
        restoreFragment,
        editor.prosemirrorState.schema,
      );

      editor.transact((tr) => {
        tr.replace(0, tr.doc.content.size - 2, pmDoc.slice(0));
      });
    };

    const updateSnapshots = async () => {
      const snapshots = await endpoints.listSnapshots();
      store.setState((state) => ({
        ...state,
        snapshots,
      }));
    };

    const initSnapshots = async () => {
      await updateSnapshots();

      if (store.state.snapshots.length > 0) {
        const snapshotContent = await endpoints.fetchSnapshotContent(
          store.state.snapshots[0].id,
        );

        applySnapshot(snapshotContent);
      }
    };

    const selectSnapshot = async (id: string | undefined) => {
      store.setState((state) => ({
        ...state,
        selectedSnapshotId: id,
      }));

      if (id === undefined) {
        // when we go back to the original document, just revert changes `.merge({ keepChanges: false })`
        editor.getExtension(ForkYDocExtension)!.merge({ keepChanges: false });
        return;
      }
      editor.getExtension(ForkYDocExtension)!.fork();
      const snapshotContent = await endpoints.fetchSnapshotContent(id);

      // replace editor contents with the snapshot contents (affecting the forked document not the original)
      applySnapshot(snapshotContent);
    };

    return {
      key: "versioning",
      store,
      mount: () => {
        initSnapshots();
      },
      listSnapshots: async (): Promise<VersionSnapshot[]> => {
        await updateSnapshots();

        return store.state.snapshots;
      },
      createSnapshot: async (name?: string): Promise<VersionSnapshot> => {
        await endpoints.createSnapshot(fragment, name);
        await updateSnapshots();

        return store.state.snapshots[0];
      },
      canRestoreSnapshot: endpoints.restoreSnapshot !== undefined,
      restoreSnapshot: endpoints.restoreSnapshot
        ? async (id: string): Promise<Uint8Array> => {
            selectSnapshot(undefined);

            const snapshotContent = await endpoints.restoreSnapshot!(
              fragment,
              id,
            );
            applySnapshot(snapshotContent);
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

      selectSnapshot,
    } as const;
  },
);
