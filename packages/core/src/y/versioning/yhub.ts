import * as Y from "@y/y";
import { decodeAny, encodeAny } from "lib0/buffer";

import {
  sortSnapshotsNewestFirst,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";
import { uint32 } from "lib0/random";

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
  /** Custom attribution key-value pairs (when `customAttributions=true`). */
  customAttributions?: Array<{ k: string; v: string }>;
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
  /**
   * Encoded {@link Y.ContentMap} describing who authored each change in the
   * window and when. Present when the changeset is requested with
   * `attributions=true`.
   */
  attributions?: Uint8Array;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a version-tagged YHub activity entry into a {@link VersionSnapshot}.
 *
 * Version markers are activity entries created with `type:version` custom
 * attributions. The `id` attribution is used as the snapshot identifier.
 * The `name` attribution value becomes the snapshot name.
 */
function activityToSnapshot(
  entry: YHubActivityEntry,
): VersionSnapshot | undefined {
  const id = entry.customAttributions?.find((a) => a.k === "id")?.v;
  if (!id) {
    return undefined;
  }
  const name = entry.customAttributions?.find((a) => a.k === "name")?.v;
  return {
    id,
    name,
    createdAt: entry.to,
    updatedAt: entry.to,
    secondaryLabel: entry.by,
  };
}

async function yhubFetch(
  url: string,
  headers: Record<string, string>,
  init?: RequestInit,
): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init?.headers)
          ? Object.fromEntries(init.headers)
          : init?.headers),
    },
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
 * Versions are created by PATCHing the document with custom attributions
 * (`type:version` + an optional `name`). The `list` endpoint filters the
 * activity timeline to only these version markers, so intermediate edits
 * don't appear in the version history.
 *
 * Because YHub attributions are immutable, `updateSnapshotName` is not
 * supported — a version's name is fixed at creation time.
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
): VersioningEndpoints<Y.Type, Uint8Array, Y.ContentMap> {
  const { baseUrl, org, docId, headers = {}, activityLimit = 50 } = options;

  const activityUrl = `${baseUrl}/activity/${org}/${docId}`;
  const changesetUrl = `${baseUrl}/changeset/${org}/${docId}`;
  const rollbackUrl = `${baseUrl}/rollback/${org}/${docId}`;

  // ------------------------------------------------------------------
  // list
  // ------------------------------------------------------------------
  const list: VersioningEndpoints<
    Y.Type,
    Uint8Array,
    Y.ContentMap
  >["list"] = async () => {
    const params = new URLSearchParams({
      order: "desc",
      limit: String(activityLimit),
      customAttributions: "true",
      withCustomAttributions: "type:version",
    });

    const buf = await yhubFetch(`${activityUrl}?${params}`, headers);
    const entries = decodeAny(new Uint8Array(buf)) as YHubActivityEntry[];

    const snapshots = entries
      .map(activityToSnapshot)
      .filter((s): s is VersionSnapshot => s !== undefined);
    return sortSnapshotsNewestFirst(snapshots);
  };

  // ------------------------------------------------------------------
  // patchDoc (internal)
  // ------------------------------------------------------------------
  /**
   * PATCH the current document state to YHub, optionally with custom
   * attributions. Used both for creating named version markers and for
   * backing up the document before a restore.
   */
  const patchDoc = async (
    fragment: Y.Type,
    customAttributions: Array<{ k: string; v: any }>,
  ) => {
    const doc = fragment.doc;
    if (!doc) {
      throw new Error(
        "Cannot patch document: the Y.Type is not attached to a Y.Doc.",
      );
    }

    // YHub only records custom attributions when they attach to NEW content
    // that survives its server-side diff. An update-less PATCH is rejected
    // (400 — "at least one of update or awareness must be present"), and even
    // if it weren't, there'd be no content for the attributions to ride on, so
    // no activity entry is created. YHub has no metadata-only marker path.
    //
    // So we introduce a tiny piece of novel content for the marker to attach
    // to: a single insert into a dedicated `__bn_version_markers` fragment that
    // the editor never renders. A fresh Y.Doc guarantees a clientID/content the
    // server has never seen, so the diff is non-empty and the attributions land
    // on it. The reconstructed document at this version's timestamp still
    // contains the full editor content — this marker only ever lives in the
    // throwaway fragment.
    const markerDoc = new Y.Doc();
    markerDoc.get("__bn_version_markers", "XmlFragment").insert(0, ["v"]);
    const update = Y.encodeStateAsUpdate(markerDoc);

    const body: Record<string, unknown> = { update, customAttributions };

    await yhubFetch(`${baseUrl}/ydoc/${org}/${docId}`, headers, {
      method: "PATCH",
      body: encodeAny(body) as BufferSource,
    });
  };

  // ------------------------------------------------------------------
  // create
  // ------------------------------------------------------------------
  const create: VersioningEndpoints<
    Y.Type,
    Uint8Array,
    Y.ContentMap
  >["create"] = async (fragment, options) => {
    const id = String(uint32());
    const now = Date.now();

    const customAttributions: Array<{ k: string; v: string }> = [
      { k: "type", v: "version" },
      { k: "id", v: id },
    ];
    if (options?.name) {
      customAttributions.push({ k: "name", v: options.name });
    }

    await patchDoc(fragment, customAttributions);

    return {
      id,
      name: options?.name,
      createdAt: now,
      updatedAt: now,
    };
  };

  // ------------------------------------------------------------------
  // getContentAt (internal)
  // ------------------------------------------------------------------
  /**
   * Reconstruct the full document state as it was at a given `to` timestamp.
   *
   * The changeset endpoint builds `nextDoc` purely from the `to` timestamp
   * range — it ignores `withCustomAttributions` for doc reconstruction (that
   * filter only scopes the attribution overlay). So historical document state
   * can only be retrieved by timestamp, never by the version's `id`.
   */
  const getContentAt = async (to: number): Promise<Uint8Array> => {
    const params = new URLSearchParams({
      ydoc: "true",
      to: String(to),
    });

    const buf = await yhubFetch(`${changesetUrl}?${params}`, headers);
    const changeset = decodeAny(new Uint8Array(buf)) as YHubChangeset;

    if (!changeset.nextDoc) {
      throw new Error(`YHub returned no document state at timestamp ${to}.`);
    }

    return Y.convertUpdateFormatV1ToV2(changeset.nextDoc);
  };

  // ------------------------------------------------------------------
  // getContent
  // ------------------------------------------------------------------
  const getContent: VersioningEndpoints<
    Y.Type,
    Uint8Array,
    Y.ContentMap
  >["getContent"] = async (snapshot) => {
    // The snapshot's `createdAt` is the activity entry's `to` timestamp (see
    // `activityToSnapshot`), which is exactly what the changeset API needs.
    return getContentAt(snapshot.createdAt);
  };

  // ------------------------------------------------------------------
  // getAttributions
  // ------------------------------------------------------------------
  const getAttributions: VersioningEndpoints<
    Y.Type,
    Uint8Array,
    Y.ContentMap
  >["getAttributions"] = async (snapshot, compareTo) => {
    // Snapshots carry their `to` timestamp directly in `createdAt`, so no
    // activity lookup is needed to resolve the changeset window.
    const to = snapshot.createdAt;
    const from = compareTo !== undefined ? compareTo.createdAt : 0;

    const params = new URLSearchParams({
      from: String(from),
      to: String(to),
      attributions: "true",
    });

    const buf = await yhubFetch(`${changesetUrl}?${params}`, headers);
    const changeset = decodeAny(new Uint8Array(buf)) as YHubChangeset;

    if (!changeset.attributions) {
      throw new Error(
        `YHub returned no attributions for snapshot ${snapshot.id}.`,
      );
    }

    return Y.decodeContentMap(changeset.attributions);
  };

  // ------------------------------------------------------------------
  // restore
  // ------------------------------------------------------------------
  const restore: VersioningEndpoints<
    Y.Type,
    Uint8Array,
    Y.ContentMap
  >["restore"] = async (_fragment, snapshot) => {
    // Fetch the target version's content and roll back everything after it.
    // The snapshot's `createdAt` is the activity entry's `to` timestamp.
    const to = snapshot.createdAt;
    const snapshotContent = await getContentAt(to);

    await yhubFetch(`${rollbackUrl}?from=${to}`, headers, {
      method: "POST",
      body: encodeAny({ from: to }) as BufferSource,
    });

    return snapshotContent;
  };

  // ------------------------------------------------------------------
  // Return
  // ------------------------------------------------------------------
  return {
    list,
    create,
    getContent,
    getAttributions,
    restore,
  };
}
