import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
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

import { SuggestionsExtension } from "../Suggestions/Suggestions.js";

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
  /**
   * The snapshot object.
   */
  snapshot: Y.Snapshot;
}

/**
 * TODO I need to re-think how all of this works.
 *
 * I want to be able to support:
 *  - The user using Y.Snapshot (scrubbing through the current document)
 *  - The user using completely separate snapshots (independent documents)
 */

export interface VersioningEndpoints {
  /**
   * List all created snapshots for this document.
   */
  listSnapshots: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot for this document with the current content.
   */
  createSnapshot: (
    /**
     * The fragment of the snapshot to create.
     */
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
   * @returns the snapshot object
   */
  restoreSnapshot?: (
    fragment: Y.XmlFragment,
    id: string,
  ) => Promise<{ snapshot: Y.Snapshot; fragment: Y.XmlFragment }>;
  /**
   * Fetch the contents of a snapshot. This is useful for previewing a
   * snapshot before choosing to revert it.
   *
   * @returns the fragment to render
   */
  fetchSnapshot?: (
    /**
     * The id of the snapshot to fetch the contents of.
     */
    id: string,
    /**
     * The current fragment of the document.
     */
    fragment: Y.XmlFragment,
    /**
     * Get the snapshot object.
     */
    getSnapshot: () => Y.Snapshot,
  ) => Promise<Y.XmlFragment>;
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

    const applySnapshot = (snapshot: Y.Snapshot) => {
      const yDoc = Y.createDocFromSnapshot(fragment.doc!, snapshot);

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
      // TODO probably only need to do this when viewing version history, otherwise this would be a hit each editor load
      // await updateSnapshots();

      if (store.state.snapshots.length > 0) {
        const snapshotContent = await endpoints.fetchSnapshot(
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
      const snapshotContent = await endpoints.fetchSnapshot(id);

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
        ? async (id: string): Promise<Y.Snapshot> => {
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

      selectSnapshot: async (id: string | undefined) => {
        const suggestions = editor.getExtension(SuggestionsExtension);
        if (suggestions !== undefined) {
          suggestions.disableSuggestions();
        }

        await selectSnapshot(id);
      },
    } as const;
  },
);
