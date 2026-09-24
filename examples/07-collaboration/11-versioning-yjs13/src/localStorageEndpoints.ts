import * as Y from "yjs";
import { toBase64, fromBase64 } from "lib0/buffer";

import type {
  VersioningEndpoints,
  VersionSnapshot,
} from "@blocknote/core/extensions";

const DEFAULT_STORAGE_KEY = "blocknote-versioning-yjs-snapshots";

function getContentsKey(storageKey: string) {
  return `${storageKey}-contents`;
}

function readSnapshots(storageKey: string): VersionSnapshot[] {
  const snapshots = JSON.parse(
    localStorage.getItem(storageKey) ?? "[]",
  ) as VersionSnapshot[];
  return snapshots.sort((a, b) => b.createdAt - a.createdAt);
}

function writeSnapshots(storageKey: string, snapshots: VersionSnapshot[]) {
  localStorage.setItem(
    storageKey,
    JSON.stringify([...snapshots].sort((a, b) => b.createdAt - a.createdAt)),
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
    // The current version is the live document. There's no server clock here,
    // so it's simply stamped "now"; it isn't a stored snapshot, so it's never
    // passed to `getContent` (the sidebar previews it live via
    // `previewCurrentVersion`).
    return {
      current: { id: "current", createdAt: Date.now() },
      snapshots: readSnapshots(storageKey),
    };
  };

  const createSnapshot: NonNullable<
    VersioningEndpoints<Y.XmlFragment, Uint8Array>["create"]
  > = async (fragment, options) => {
    const snapshot = {
      id: crypto.randomUUID(),
      name: options.name,
      createdAt: Date.now(),
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
    const encoded = readContents(storageKey)[snapshot.id];
    if (encoded === undefined) {
      throw new Error(`Document snapshot ${snapshot.id} could not be found.`);
    }
    return fromBase64(encoded);
  };

  const restoreSnapshot: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["restore"] = async (fragment, snapshot) => {
    const snapshotContent = await fetchSnapshotContent(snapshot);
    await createSnapshot(fragment, { name: "Backup" });
    return snapshotContent;
  };

  const rename: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["rename"] = async (snapshot, name) => {
    const snapshots = readSnapshots(storageKey);
    const stored = snapshots.find((s) => s.id === snapshot.id);
    if (stored === undefined) {
      throw new Error(`Document snapshot ${snapshot.id} could not be found.`);
    }

    stored.name = name;
    writeSnapshots(storageKey, snapshots);
  };

  const remove: VersioningEndpoints<
    Y.XmlFragment,
    Uint8Array
  >["remove"] = async (snapshot) => {
    const snapshots = readSnapshots(storageKey);
    if (!snapshots.some((s) => s.id === snapshot.id)) {
      throw new Error(`Document snapshot ${snapshot.id} could not be found.`);
    }

    // Drop the snapshot metadata and its stored content.
    writeSnapshots(
      storageKey,
      snapshots.filter((s) => s.id !== snapshot.id),
    );

    const contents = readContents(storageKey);
    delete contents[snapshot.id];
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

/** Whether any versions have been stored under `storageKey` yet. */
export function hasStoredVersions(storageKey = DEFAULT_STORAGE_KEY): boolean {
  return localStorage.getItem(storageKey) !== null;
}

/**
 * Store versions directly, bypassing `create`: the demo seeds sample history
 * with back-dated timestamps, which `create` (which stamps "now") can't do.
 */
export function storeVersions(
  versions: Array<{ name?: string; createdAt: number; content: Uint8Array }>,
  storageKey = DEFAULT_STORAGE_KEY,
) {
  const snapshots = readSnapshots(storageKey);
  const contents = readContents(storageKey);
  for (const version of versions) {
    const id = crypto.randomUUID();
    snapshots.push({ id, name: version.name, createdAt: version.createdAt });
    contents[id] = toBase64(version.content);
  }
  writeContents(storageKey, contents);
  writeSnapshots(storageKey, snapshots);
}
