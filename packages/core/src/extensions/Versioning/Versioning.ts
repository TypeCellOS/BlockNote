import * as Y from "yjs";

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
   * If defined, indicates that the snapshot was created by reverting to a
   * previous snapshot with the given ID.
   */
  revertedSnapshotId?: string;
  /**
   * Additional metadata about the snapshot.
   */
  meta: {
    /**
     * The user IDs associated with the snapshot.
     */
    userIds?: string[];
    /**
     * The content of the snapshot.
     */
    contents?: Uint8Array;
    selected?: boolean;
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
  updateSnapshotName?: (id: string, name: string) => Promise<void>;
}

export const VersioningExtension = createExtension(
  ({
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
    const updateSnapshotsSync = () => {
      updateSnapshots();
    };

    return {
      key: "versioning",
      store,
      mount: () => updateSnapshotsSync(),
      // TODO I'd probably have:
      // canRestoreSnapshot: () => boolean;
      // canUpdateSnapshotName: () => boolean;
      listSnapshots: async (): Promise<VersionSnapshot[]> => {
        await updateSnapshots();

        return store.state.snapshots;
      },
      createSnapshot: async (name?: string): Promise<VersionSnapshot> => {
        await endpoints.createSnapshot(fragment, name);
        await updateSnapshots();

        return store.state.snapshots[0];
      },
      restoreSnapshot: endpoints.restoreSnapshot
        ? async (id: string): Promise<Uint8Array> => {
            const snapshotContent = await endpoints.restoreSnapshot!(
              fragment,
              id,
            );
            await updateSnapshots();

            return snapshotContent;
          }
        : undefined,
      fetchSnapshotContent: async (id: string): Promise<Uint8Array> => {
        const storeSnapshot = store.state.snapshots.find(
          (snapshot) => snapshot.id === id,
        );
        if (storeSnapshot && storeSnapshot.meta.contents !== undefined) {
          return storeSnapshot.meta.contents;
        }

        const snapshotContent = await endpoints.fetchSnapshotContent(id);
        await updateSnapshots();

        return snapshotContent;
      },
      updateSnapshotName: endpoints.updateSnapshotName
        ? async (id: string, name: string): Promise<void> => {
            await endpoints.updateSnapshotName!(id, name);
            await updateSnapshots();
          }
        : undefined,

      selectSnapshot: (id: string | undefined) => {
        store.setState((state) => ({
          ...state,
          selectedSnapshotId: id,
        }));
      },
    } as const;
  },
);

// /**
//  * Here is a mock implementation of the VersionAPI for the demo
//  */
// export const MockVersionAPI = Object.assign(
//   {
//     listSnapshots: async () => {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 600 + Math.random() * 1000),
//       );
//       return JSON.parse(
//         localStorage.getItem("versions") ?? "[]",
//       ) as VersionSnapshot[];
//     },
//     createSnapshot: async (name, fragment) => {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 600 + Math.random() * 1000),
//       );
//       const snapshot = {
//         id: v4(),
//         name,
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//         meta: {
//           userIds: ["User"],
//           // @ts-expect-error - toBase64 is not a method on Uint8Array in types, but exists in chrome
//           contents: Y.encodeStateAsUpdateV2(fragment.doc!).toBase64(),
//         },
//       } satisfies VersionSnapshot;
//       localStorage.setItem(
//         "versions",
//         JSON.stringify([
//           snapshot,
//           ...(JSON.parse(
//             localStorage.getItem("versions") ?? "[]",
//           ) as VersionSnapshot[]),
//         ]),
//       );
//       return Promise.resolve(snapshot);
//     },
//     fetchSnapshotContent: async (id: string) => {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 600 + Math.random() * 1000),
//       );
//       const snapshot = (
//         JSON.parse(
//           localStorage.getItem("versions") ?? "[]",
//         ) as VersionSnapshot[]
//       ).find((snapshot) => snapshot.id === id);
//       if (snapshot === undefined) {
//         throw new Error(`Document snapshot ${id} could not be found.`);
//       }
//       const binaryString = atob(snapshot.meta.contents as string);
//       const uint8Array = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
//       return Promise.resolve(uint8Array);
//     },
//     restoreSnapshot: async (id: string) => {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 600 + Math.random() * 1000),
//       );
//       const versions = JSON.parse(
//         localStorage.getItem("versions") ?? "[]",
//       ) as VersionSnapshot[];
//       const snapshotIndex = versions.findIndex(
//         (snapshot: VersionSnapshot) => snapshot.id === id,
//       );
//       if (snapshotIndex === -1) {
//         throw new Error(`Document snapshot ${id} could not be found.`);
//       }
//       const snapshot = versions[snapshotIndex].meta.contents as string;
//       const binaryString = atob(snapshot);
//       const uint8Array = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
//       return Promise.resolve(uint8Array);
//     },
//     updateSnapshotName: async (id: string, name: string) => {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 600 + Math.random() * 1000),
//       );
//       const snapshot = JSON.parse(
//         localStorage.getItem("versions") ?? "[]",
//       ).find((snapshot: VersionSnapshot) => snapshot.id === id);
//       if (snapshot === undefined) {
//         throw new Error(`Document snapshot ${id} could not be found.`);
//       }
//       snapshot.name = name;
//       localStorage.setItem("versions", JSON.stringify(snapshot));
//       return Promise.resolve();
//     },
//   } satisfies VersioningEndpoints,
//   {
//     // This will load the initial snapshot from the localStorage for the demo
//     getInitialSnapshot: () => {
//       return JSON.parse(
//         localStorage.getItem("versions") ?? "[]",
//       )[0] as VersionSnapshot;
//     },
//   },
// );
