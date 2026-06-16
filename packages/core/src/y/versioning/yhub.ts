import * as Y from "@y/y";
import { decodeAny, encodeAny } from "lib0/buffer";

import {
  sortSnapshotsNewestFirst,
  type CreateSnapshotOptions,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for creating a YHub versioning endpoints instance.
 */
export interface YHubVersioningOptions {
  /**
   * Base URL of the YHub API (e.g. `"https://yhub.example.com"`).
   * Must **not** include a trailing slash.
   */
  baseUrl: string;

  /** YHub organisation identifier. */
  org: string;

  /** Document identifier within the organisation. */
  docId: string;

  /**
   * Optional headers to include in every request (e.g. authentication tokens).
   */
  headers?: Record<string, string>;

  /**
   * Maximum number of activity entries to fetch when listing versions.
   * @default 50
   */
  activityLimit?: number;
}

/**
 * Shape of a single activity entry returned by the YHub
 * `GET /activity/{org}/{docId}` endpoint (after `decodeAny`).
 */
interface YHubActivityEntry {
  /** Start of the change window (unix-ms timestamp). */
  from: number;
  /** End of the change window (unix-ms timestamp). */
  to: number;
  /** User who authored the change (when `customAttributions` is enabled). */
  by?: string;
}

/**
 * Shape returned by the YHub `GET /changeset/{org}/{docId}` endpoint (after
 * `decodeAny`).
 */
interface YHubChangeset {
  /** Full Y.Doc state **before** the changeset window. */
  prevDoc?: Uint8Array;
  /** Full Y.Doc state **after** the changeset window. */
  nextDoc?: Uint8Array;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Snapshot-metadata store (names & options that aren't tracked by YHub). */
interface SnapshotMeta {
  name?: string;
  restoredFromSnapshotId?: string;
}

/**
 * Convert a YHub activity entry into a {@link VersionSnapshot}.
 */
function activityToSnapshot(
  entry: YHubActivityEntry,
  meta?: SnapshotMeta,
): VersionSnapshot {
  return {
    id: String(entry.to),
    name: meta?.name,
    createdAt: entry.from,
    updatedAt: entry.to,
    secondaryLabel: entry.by,
    restoredFromSnapshotId: meta?.restoredFromSnapshotId,
  };
}

async function yhubFetch(
  url: string,
  headers: Record<string, string>,
  init?: RequestInit,
): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(
      `YHub request failed: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link VersioningEndpoints} implementation backed by the
 * [YHub](https://github.com/yjs/yhub) HTTP API.
 *
 * YHub stores continuous edit history rather than discrete snapshots.  This
 * adapter maps YHub's *activity* entries to {@link VersionSnapshot}s so they
 * can be listed, previewed, and restored through BlockNote's versioning UI.
 *
 * @example
 * ```ts
 * import { withCollaboration } from "@blocknote/core/y";
 * import { createYHubVersioningEndpoints } from "@blocknote/core/y";
 *
 * const editor = BlockNoteEditor.create(
 *   withCollaboration({
 *     collaboration: {
 *       fragment,
 *       user: { name: "Alice", color: "#ff0" },
 *       provider,
 *       versioningEndpoints: createYHubVersioningEndpoints({
 *         baseUrl: "https://yhub.example.com",
 *         org: "my-org",
 *         docId: "my-doc",
 *       }),
 *     },
 *   }),
 * );
 * ```
 */
export function createYHubVersioningEndpoints(
  options: YHubVersioningOptions,
): VersioningEndpoints<Y.Type, Uint8Array> {
  const { baseUrl, org, docId, headers = {}, activityLimit = 50 } = options;

  const activityUrl = `${baseUrl}/activity/${org}/${docId}`;
  const changesetUrl = `${baseUrl}/changeset/${org}/${docId}`;
  const rollbackUrl = `${baseUrl}/rollback/${org}/${docId}`;

  // Client-side metadata (names, restored-from links) keyed by snapshot id.
  const metaMap = new Map<string, SnapshotMeta>();

  // ------------------------------------------------------------------
  // list
  // ------------------------------------------------------------------
  const list: VersioningEndpoints<Y.Type, Uint8Array>["list"] = async () => {
    const params = new URLSearchParams({
      order: "desc",
      limit: String(activityLimit),
      group: "true",
      customAttributions: "true",
    });

    const buf = await yhubFetch(`${activityUrl}?${params}`, headers);
    const entries = decodeAny(new Uint8Array(buf)) as YHubActivityEntry[];

    return sortSnapshotsNewestFirst(
      entries.map((e) => activityToSnapshot(e, metaMap.get(String(e.to)))),
    );
  };

  // ------------------------------------------------------------------
  // create
  // ------------------------------------------------------------------
  const create: VersioningEndpoints<Y.Type, Uint8Array>["create"] = async (
    fragment: Y.Type,
    opts?: CreateSnapshotOptions,
  ) => {
    const doc = fragment.doc;
    if (!doc) {
      throw new Error(
        "Cannot create snapshot: the Y.Type is not attached to a Y.Doc.",
      );
    }

    // Encode the current document state.
    const update = Y.encodeStateAsUpdateV2(doc);

    // Persist via PATCH /ydoc to make sure the current state is stored.
    await yhubFetch(`${baseUrl}/ydoc/${org}/${docId}`, headers, {
      method: "PATCH",
      body: encodeAny({ update }) as Blob | BufferSource,
    });

    const now = Date.now();
    const id = String(now);

    const meta: SnapshotMeta = {
      name: opts?.name,
      restoredFromSnapshotId: opts?.restoredFromSnapshotId,
    };
    metaMap.set(id, meta);

    return {
      id,
      name: opts?.name,
      createdAt: now,
      updatedAt: now,
      restoredFromSnapshotId: opts?.restoredFromSnapshotId,
    };
  };

  // ------------------------------------------------------------------
  // getContent
  // ------------------------------------------------------------------
  const getContent: VersioningEndpoints<
    Y.Type,
    Uint8Array
  >["getContent"] = async (id: string) => {
    const to = Number(id);
    const params = new URLSearchParams({
      from: "0",
      to: String(to),
      ydoc: "true",
    });

    const buf = await yhubFetch(`${changesetUrl}?${params}`, headers);
    const changeset = decodeAny(new Uint8Array(buf)) as YHubChangeset;

    if (!changeset.nextDoc) {
      throw new Error(`YHub returned no document state for snapshot ${id}.`);
    }

    return changeset.nextDoc;
  };

  // ------------------------------------------------------------------
  // restore
  // ------------------------------------------------------------------
  const restore: VersioningEndpoints<Y.Type, Uint8Array>["restore"] = async (
    fragment: Y.Type,
    id: string,
  ) => {
    // 1. Create a backup snapshot of the current state.
    await create(fragment, { name: "Backup" });

    // 2. Get the content of the target snapshot.
    const snapshotContent = await getContent(id);

    // 3. Issue a rollback via YHub. Rolling back everything after the target
    //    timestamp effectively restores the document to that point.
    const to = Number(id);
    await yhubFetch(`${rollbackUrl}?from=${to}`, headers, {
      method: "POST",
      body: encodeAny({ from: to, customAttributions: true }) as
        | Blob
        | BufferSource,
    });

    // 4. Record metadata for the restored snapshot.
    const restoredSnapshot = await create(fragment, {
      name: "Restored Snapshot",
      restoredFromSnapshotId: id,
    });

    metaMap.set(restoredSnapshot.id, {
      name: "Restored Snapshot",
      restoredFromSnapshotId: id,
    });

    return snapshotContent;
  };

  // ------------------------------------------------------------------
  // updateSnapshotName
  // ------------------------------------------------------------------
  const updateSnapshotName: VersioningEndpoints<
    Y.Type,
    Uint8Array
  >["updateSnapshotName"] = async (id: string, name?: string) => {
    const existing = metaMap.get(id) ?? {};
    metaMap.set(id, { ...existing, name });
  };

  // ------------------------------------------------------------------
  // Return
  // ------------------------------------------------------------------
  return {
    list,
    create,
    getContent,
    restore,
    updateSnapshotName,
  };
}
