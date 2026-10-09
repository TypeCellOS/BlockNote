import * as Y from "yjs";
import { toBase64, fromBase64 } from "lib0/buffer";

import type {
  VersionStorage,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { findTypeInOtherYdoc } from "@blocknote/core/yjs";

/** Restore into the live fragment, never the fork currently displayed. */
function restoreYjsVersion(fragment: Y.XmlFragment, content: Uint8Array) {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, content);
    const children = findTypeInOtherYdoc(fragment, doc)
      .slice()
      .map((child) => child.clone());
    fragment.doc!.transact(() => {
      fragment.delete(0, fragment.length);
      fragment.insert(0, children);
    });
  } finally {
    doc.destroy();
  }
}

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
  fragment: Y.XmlFragment,
  storageKey = DEFAULT_STORAGE_KEY,
): VersionStorage<Uint8Array> {
  const listSnapshots: VersionStorage<Uint8Array>["list"] = async () => {
    // The current version is the live document. There's no server clock here,
    // so it's simply stamped "now"; it isn't a stored snapshot, so it's never
    // passed to `getContent` (the sidebar previews it live via
    // `previewCurrentVersion`).
    return { ok: true, value: { snapshots: readSnapshots(storageKey) } };
  };

  const createSnapshot: NonNullable<
    VersionStorage<Uint8Array>["create"]
  > = async (content, name) => {
    const snapshot = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    } satisfies VersionSnapshot;

    const contents = readContents(storageKey);
    contents[snapshot.id] = toBase64(content);
    writeContents(storageKey, contents);

    writeSnapshots(storageKey, [snapshot, ...readSnapshots(storageKey)]);

    return { ok: true, value: snapshot };
  };

  const fetchSnapshotContent: VersionStorage<Uint8Array>["getContent"] = async (
    id,
    signal,
  ) => {
    signal.throwIfAborted();
    const encoded = readContents(storageKey)[id];
    if (encoded === undefined) {
      return { ok: false, error: { type: "not-found" } };
    }
    return { ok: true, value: fromBase64(encoded) };
  };

  const restoreSnapshot: VersionStorage<Uint8Array>["restore"] = async (id) => {
    const snapshotContent = await fetchSnapshotContent(
      id,
      new AbortController().signal,
    );
    if (!snapshotContent.ok) return snapshotContent;
    const backup = await createSnapshot(
      Y.encodeStateAsUpdate(fragment.doc!),
      "Backup",
    );
    if (!backup.ok) return backup;
    restoreYjsVersion(fragment, snapshotContent.value);
    return { ok: true, value: undefined };
  };

  const rename: VersionStorage<Uint8Array>["rename"] = async (id, name) => {
    const snapshots = readSnapshots(storageKey);
    const stored = snapshots.find((s) => s.id === id);
    if (stored === undefined) {
      return { ok: false, error: { type: "not-found" } };
    }

    stored.name = name;
    writeSnapshots(storageKey, snapshots);
    return { ok: true, value: undefined };
  };

  const remove: VersionStorage<Uint8Array>["remove"] = async (id) => {
    const snapshots = readSnapshots(storageKey);
    if (!snapshots.some((s) => s.id === id)) {
      return { ok: false, error: { type: "not-found" } };
    }

    // Drop the snapshot metadata and its stored content.
    writeSnapshots(
      storageKey,
      snapshots.filter((s) => s.id !== id),
    );

    const contents = readContents(storageKey);
    delete contents[id];
    writeContents(storageKey, contents);
    return { ok: true, value: undefined };
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
