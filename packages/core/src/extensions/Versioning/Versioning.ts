import {
  findTypeInOtherYdoc,
  ySyncPluginKey,
  SnapshotItem,
} from "@y/prosemirror";
import * as Y from "@y/y";

import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

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

        Y.applyUpdateV2(fragment.doc!, snapshotContent);
      }
    };

    const selectSnapshot = async (
      id: string | undefined,
      compareToSnapshotId?: string,
    ) => {
      store.setState((state) => ({
        ...state,
        selectedSnapshotId: id,
      }));

      if (id === undefined) {
        // when we go back to the original document, just revert changes
        ySyncPluginKey.getState(editor.prosemirrorState)?.resumeSync();
        return;
      }

      let prevSnapshot: SnapshotItem | undefined = undefined;
      if (compareToSnapshotId) {
        const compareToSnapshotContent =
          await endpoints.fetchSnapshotContent(compareToSnapshotId);
        const compareToDoc = new Y.Doc({ isSuggestionDoc: true });
        Y.applyUpdateV2(compareToDoc, compareToSnapshotContent);
        const compareToFragment = findTypeInOtherYdoc(fragment, compareToDoc);
        prevSnapshot = {
          fragment: compareToFragment,
        };
      }

      const snapshotContent = await endpoints.fetchSnapshotContent(id);
      const doc = new Y.Doc();
      Y.applyUpdateV2(doc, snapshotContent);
      ySyncPluginKey
        .getState(editor.prosemirrorState)
        ?.renderSnapshot(
          { fragment: findTypeInOtherYdoc(fragment, doc) },
          prevSnapshot,
          [
            Y.createAttributionItem("insert", ["John Doe"]),
            // Y.createAttributionItem("delete", ["John Doe"]),
          ],
        );
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
        ? async (_id: string): Promise<Uint8Array> => {
            selectSnapshot(undefined);

            // const snapshotContent = await endpoints.restoreSnapshot!(
            //   fragment,
            //   id,
            // );
            throw new Error("Not implemented");
            // applySnapshot(snapshotContent);
            // await updateSnapshots();

            // return snapshotContent;
          }
        : undefined,
      canUpdateSnapshotName: endpoints.updateSnapshotName !== undefined,
      updateSnapshotName: endpoints.updateSnapshotName
        ? async (id: string, name?: string): Promise<void> => {
            await endpoints.updateSnapshotName!(id, name);
            await updateSnapshots();
          }
        : undefined,

      selectSnapshot: async (
        id: string | undefined,
        compareToSnapshotId?: string,
      ) => {
        await selectSnapshot(id, compareToSnapshotId);
      },
    } as const;
  },
);
