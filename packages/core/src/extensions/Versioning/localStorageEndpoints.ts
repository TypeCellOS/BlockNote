import { v4 } from "uuid";
import * as Y from "yjs";

import { VersioningEndpoints, VersionSnapshot } from "./Versioning.js";

const listSnapshots: VersioningEndpoints["listSnapshots"] = async () =>
  JSON.parse(localStorage.getItem("snapshots") ?? "[]") as VersionSnapshot[];

const createSnapshot = async (
  fragment: Y.XmlFragment,
  name?: string,
  revertedSnapshotId?: string,
): Promise<VersionSnapshot> => {
  const snapshot = {
    id: v4(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    revertedSnapshotId,
    meta: {
      userIds: ["User1"],
      // @ts-expect-error - toBase64 is not a method on Uint8Array in types, but exists in chrome
      contents: Y.encodeStateAsUpdateV2(fragment.doc!).toBase64(),
    },
  } satisfies VersionSnapshot;

  localStorage.setItem(
    "snapshots",
    JSON.stringify([snapshot, ...(await listSnapshots())]),
  );

  return Promise.resolve(snapshot);
};

const fetchSnapshotContent: VersioningEndpoints["fetchSnapshotContent"] =
  async (id) => {
    const snapshots = await listSnapshots();

    const snapshot = snapshots.find(
      (snapshot: VersionSnapshot) => snapshot.id === id,
    );
    if (snapshot === undefined) {
      throw new Error(`Document snapshot ${id} could not be found.`);
    }
    if (!("contents" in snapshot.meta)) {
      throw new Error(`Document snapshot ${id} doesn't contain content.`);
    }
    if (typeof snapshot.meta.contents !== "string") {
      throw new Error(`Document snapshot ${id} contains invalid content.`);
    }

    return Promise.resolve(
      Uint8Array.from(atob(snapshot.meta.contents), (c) => c.charCodeAt(0)),
    );
  };

const restoreSnapshot: VersioningEndpoints["restoreSnapshot"] = async (
  fragment,
  id,
) => {
  await createSnapshot(fragment, "Backup");

  Y.mergeUpdatesV2([await fetchSnapshotContent(id)]);

  await createSnapshot(fragment, "Restored Snapshot", id);

  return Promise.resolve(
    // @ts-expect-error - toBase64 is not a method on Uint8Array in types, but exists in chrome
    Y.encodeStateAsUpdateV2(fragment.doc!).toBase64(),
  );
};

const updateSnapshotName: VersioningEndpoints["updateSnapshotName"] = async (
  id,
  name,
) => {
  const snapshots = await listSnapshots();

  const snapshot = snapshots.find(
    (snapshot: VersionSnapshot) => snapshot.id === id,
  );
  if (snapshot === undefined) {
    throw new Error(`Document snapshot ${id} could not be found.`);
  }

  snapshot.name = name;
  localStorage.setItem("snapshots", JSON.stringify(snapshots));

  return Promise.resolve();
};

export const localStorageEndpoints: VersioningEndpoints = {
  listSnapshots,
  createSnapshot,
  fetchSnapshotContent,
  restoreSnapshot,
  updateSnapshotName,
};
