import { v4 } from "uuid";
import * as Y from "yjs";
import { toBase64, fromBase64 } from "lib0/buffer";

import { VersioningEndpoints, VersionSnapshot } from "./Versioning.js";

const listSnapshots: VersioningEndpoints["listSnapshots"] = async () =>
  JSON.parse(localStorage.getItem("snapshots") ?? "[]") as VersionSnapshot[];

const createSnapshot = async (
  fragment: Y.XmlFragment,
  name?: string,
  restoredFromSnapshotId?: string,
): Promise<VersionSnapshot> => {
  const snapshot = {
    id: v4(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta: {
      restoredFromSnapshotId,
      userIds: ["User1"],
      contents: toBase64(Y.encodeSnapshotV2(Y.snapshot(fragment.doc!))),
    },
  } satisfies VersionSnapshot;

  localStorage.setItem(
    "snapshots",
    JSON.stringify([snapshot, ...(await listSnapshots())]),
  );

  return Promise.resolve(snapshot);
};

const fetchSnapshotContent: VersioningEndpoints["fetchSnapshot"] = async (
  id,
) => {
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
    Y.decodeSnapshotV2(fromBase64(snapshot.meta.contents)),
  );
};

const restoreSnapshot: VersioningEndpoints["restoreSnapshot"] = async (
  fragment,
  id,
) => {
  // take a snapshot of the current document
  await createSnapshot(fragment, "Backup");

  // hydrates the version document from it's contents, into a new Y.Doc
  const snapshotContent = await fetchSnapshotContent(id);
  const yDoc = Y.createDocFromSnapshot(fragment.doc!, snapshotContent);

  // create a new snapshot from that, to store it back in the list
  // Don't mind that the xmlFragment is not the right one, we just snapshot the whole doc anyway
  await createSnapshot(yDoc.getXmlFragment(), "Restored Snapshot", id);

  // return what the new state should be
  return snapshotContent;
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
  snapshot.updatedAt = Date.now();

  localStorage.setItem("snapshots", JSON.stringify(snapshots));

  return Promise.resolve();
};

export const localStorageEndpoints: VersioningEndpoints = {
  listSnapshots,
  createSnapshot,
  fetchSnapshot: fetchSnapshotContent,
  restoreSnapshot,
  updateSnapshotName,
};
