import * as Y from "yjs";
import { toBase64, fromBase64 } from "lib0/buffer";

import {
  type CreateSnapshotOptions,
  sortSnapshotsNewestFirst,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "@blocknote/core/extensions";

const DEFAULT_STORAGE_KEY = "blocknote-versioning-yjs-snapshots";

function getContentsKey(storageKey: string) {
  return `${storageKey}-contents`;
}

function readSnapshots(storageKey: string): VersionSnapshot[] {
  return sortSnapshotsNewestFirst(
    JSON.parse(localStorage.getItem(storageKey) ?? "[]") as VersionSnapshot[],
  );
}

function writeSnapshots(storageKey: string, snapshots: VersionSnapshot[]) {
  localStorage.setItem(
    storageKey,
    JSON.stringify(sortSnapshotsNewestFirst(snapshots)),
  );
}

function readContents(storageKey: string): Record<string, string> {
  return JSON.parse(
    localStorage.getItem(getContentsKey(storageKey)) ?? "{}",
  ) as Record<string, string>;
}

function writeContents(storageKey: string, contents: Record<string, string>) {
  localStorage.setItem(getContentsKey(storageKey), JSON.stringify(contents));
}

/**
 * Reference {@link VersioningEndpoints} implementation backed by
 * `localStorage` for yjs (v13).
 *
 * Uses `Y.encodeStateAsUpdate` / `Y.applyUpdate` (v1 encoding) instead of the
 * v2 encoding used by the `@y/y` (v14) equivalent.
 */
export function createLocalStorageVersioningEndpoints(
  storageKey = DEFAULT_STORAGE_KEY,
): VersioningEndpoints<Y.XmlFragment, Uint8Array> {
  const listSnapshots: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["list"] = async () => readSnapshots(storageKey);

  const createSnapshot = async (
    fragment: Y.XmlFragment,
    options?: CreateSnapshotOptions,
  ): Promise<VersionSnapshot> => {
    const snapshot = {
      id: crypto.randomUUID(),
      name: options?.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      restoredFromSnapshotId: options?.restoredFromSnapshotId,
    } satisfies VersionSnapshot;

    const contents = readContents(storageKey);
    contents[snapshot.id] = toBase64(Y.encodeStateAsUpdate(fragment.doc!));
    writeContents(storageKey, contents);

    writeSnapshots(storageKey, [snapshot, ...readSnapshots(storageKey)]);

    return snapshot;
  };

  const fetchSnapshotContent: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["getContent"] = async (id) => {
    const encoded = readContents(storageKey)[id];
    if (encoded === undefined) {
      throw new Error(`Document snapshot ${id} could not be found.`);
    }
    return fromBase64(encoded);
  };

  const restoreSnapshot: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["restore"] = async (fragment, id) => {
    await createSnapshot(fragment, { name: "Backup" });

    const snapshotContent = await fetchSnapshotContent(id);
    const yDoc = new Y.Doc();
    Y.applyUpdate(yDoc, snapshotContent);

    await createSnapshot(yDoc.getXmlFragment("document-store"), {
      name: "Restored Snapshot",
      restoredFromSnapshotId: id,
    });

    return snapshotContent;
  };

  const updateSnapshotName: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["updateSnapshotName"] = async (id, name) => {
    const snapshots = readSnapshots(storageKey);
    const snapshot = snapshots.find((s) => s.id === id);
    if (snapshot === undefined) {
      throw new Error(`Document snapshot ${id} could not be found.`);
    }

    snapshot.name = name;
    snapshot.updatedAt = Date.now();
    writeSnapshots(storageKey, snapshots);
  };

  return {
    list: listSnapshots,
    create: createSnapshot,
    getContent: fetchSnapshotContent,
    restore: restoreSnapshot,
    updateSnapshotName,
  };
}

/** Default localStorage-backed endpoints using {@link DEFAULT_STORAGE_KEY}. */
export const localStorageEndpoints = createLocalStorageVersioningEndpoints();
