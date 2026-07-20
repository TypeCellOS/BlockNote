import * as Y from "yjs";
import { toBase64, fromBase64 } from "lib0/buffer";

import {
  CURRENT_VERSION_ID,
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
  >["list"] = async () => {
    // Surface the live document as a "current version" entry at the top — it's
    // how the user returns to live editing and compares against saved
    // snapshots. It isn't a stored snapshot, so it's never passed to
    // `getContent` (the sidebar previews it live via `previewCurrentVersion`).
    const current: VersionSnapshot = {
      id: CURRENT_VERSION_ID,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return [current, ...readSnapshots(storageKey)];
  };

  // Stored snapshots always have string ids (only the synthetic current
  // entry carries the CURRENT_VERSION_ID symbol, and it never reaches these
  // endpoints), so coercing ids to strings below is safe.
  const createSnapshot: NonNullable<
    VersioningEndpoints<Y.XmlFragment, Uint8Array>["create"]
  > = async (fragment, options) => {
    const snapshot = {
      id: crypto.randomUUID(),
      name: options?.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      restoredFromSnapshotId: options?.restoredFromSnapshot
        ? String(options.restoredFromSnapshot.id)
        : undefined,
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
  >["getContent"] = async (snapshot) => {
    const id = String(snapshot.id);
    const encoded = readContents(storageKey)[id];
    if (encoded === undefined) {
      throw new Error(`Document snapshot ${id} could not be found.`);
    }
    return fromBase64(encoded);
  };

  const restoreSnapshot: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["restore"] = async (fragment, snapshot) => {
    await createSnapshot(fragment, { name: "Backup" });

    const snapshotContent = await fetchSnapshotContent(snapshot);
    const yDoc = new Y.Doc();
    Y.applyUpdate(yDoc, snapshotContent);

    await createSnapshot(yDoc.getXmlFragment("document-store"), {
      name: "Restored Snapshot",
      restoredFromSnapshot: snapshot,
    });

    return snapshotContent;
  };

  const rename: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["rename"] = async (snapshot, name) => {
    const snapshots = readSnapshots(storageKey);
    const stored = snapshots.find((s) => s.id === snapshot.id);
    if (stored === undefined) {
      throw new Error(
        `Document snapshot ${String(snapshot.id)} could not be found.`,
      );
    }

    stored.name = name;
    stored.updatedAt = Date.now();
    writeSnapshots(storageKey, snapshots);
  };

  const remove: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["remove"] = async (snapshot) => {
    const snapshots = readSnapshots(storageKey);
    if (!snapshots.some((s) => s.id === snapshot.id)) {
      throw new Error(
        `Document snapshot ${String(snapshot.id)} could not be found.`,
      );
    }

    // Drop the snapshot metadata and its stored content.
    writeSnapshots(
      storageKey,
      snapshots.filter((s) => s.id !== snapshot.id),
    );

    const contents = readContents(storageKey);
    delete contents[String(snapshot.id)];
    writeContents(storageKey, contents);
  };

  return {
    list: listSnapshots,
    create: createSnapshot,
    getContent: fetchSnapshotContent,
    restore: restoreSnapshot,
    rename,
    remove,
  };
}

/** Default localStorage-backed endpoints using {@link DEFAULT_STORAGE_KEY}. */
export const localStorageEndpoints = createLocalStorageVersioningEndpoints();
