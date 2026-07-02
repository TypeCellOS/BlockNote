import * as Y from "@y/y";
import { decodeAny, encodeAny } from "lib0/buffer";

import {
  CURRENT_VERSION_ID,
  sortSnapshotsNewestFirst,
  VersioningEndpointsFactory,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";
import { uint32 } from "lib0/random";
import { AttributionExtension } from "../extensions/AttributionExtension.js";
import { YCursorExtension } from "../extensions/YCursorPlugin.js";

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
  /** Comma separated list of user-ids that matches the attribution */
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
): VersioningEndpointsFactory<Y.Type, Uint8Array, Y.ContentMap> {
  const { baseUrl, org, docId, headers = {}, activityLimit = 50 } = options;

  const activityUrl = `${baseUrl}/activity/${org}/${docId}`;
  const changesetUrl = `${baseUrl}/changeset/${org}/${docId}`;
  const rollbackUrl = `${baseUrl}/rollback/${org}/${docId}`;

  return (editor) => {
    /**
     * Build the synthetic "current version" snapshot, or `undefined` when the
     * live document matches the latest saved version (no edits since).
     *
     * @param latestVersionTo The `to` timestamp of the most recent version
     *   marker, or `undefined` when no versions exist yet.
     */
    const getCurrentVersionEntry = async (
      latestVersionTo: number | undefined,
    ): Promise<VersionSnapshot | undefined> => {
      const params = new URLSearchParams({
        order: "desc",
        limit: "1",
        customAttributions: "true",
      });

      const buf = await yhubFetch(`${activityUrl}?${params}`, headers);
      const entries = decodeAny(new Uint8Array(buf)) as YHubActivityEntry[];
      const latestEdit = entries[0];

      if (!latestEdit || latestEdit.to <= (latestVersionTo ?? 0)) {
        return undefined;
      }

      return activityToSnapshot({
        ...latestEdit,
        customAttributions: [{ k: "id", v: CURRENT_VERSION_ID }],
      });
    };

    /**
     * PATCH the current document state to YHub, optionally with custom
     * attributions. Used both for creating named version markers and for
     * backing up the document before a restore.
     */
    const patchDoc = async (
      fragment: Y.Type,
      customAttributions: Array<{ k: string; v: any }>,
      by?: string,
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

      await yhubFetch(
        `${baseUrl}/ydoc/${org}/${docId}${by ? `?userid=${by}` : ""}`,
        headers,
        {
          method: "PATCH",
          body: encodeAny(body) as BufferSource,
        },
      );
    };

    /**
     * Create a named version marker for the current document state by PATCHing
     * it with `type:version` custom attributions.
     */
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

      const user = editor
        .getExtension<typeof YCursorExtension>("yCursor")
        ?.getUser();
      await patchDoc(fragment, customAttributions, user?.id);

      return {
        id,
        name: options?.name,
        createdAt: now,
        updatedAt: now,
      };
    };

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

    /**
     * Fetch the full document content for a saved version snapshot.
     *
     * The snapshot's `createdAt` is the activity entry's `to` timestamp (see
     * {@link activityToSnapshot}), which is exactly what the changeset API needs.
     */
    const getContent: VersioningEndpoints<
      Y.Type,
      Uint8Array,
      Y.ContentMap
    >["getContent"] = async (snapshot) => {
      return getContentAt(snapshot.createdAt);
    };

    /**
     * Fetch the authorship attributions for the changes between two snapshots
     * (or from the start of the document when `compareTo` is omitted).
     *
     * Snapshots carry their `to` timestamp directly in `createdAt`, so no
     * activity lookup is needed to resolve the changeset window.
     */
    const getAttributions: VersioningEndpoints<
      Y.Type,
      Uint8Array,
      Y.ContentMap
    >["getAttributions"] = async (snapshot, compareTo) => {
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

    /**
     * Restore the document to a saved version: fetch the target version's
     * content and roll back everything after it.
     *
     * The snapshot's `createdAt` is the activity entry's `to` timestamp.
     */
    const restore: VersioningEndpoints<
      Y.Type,
      Uint8Array,
      Y.ContentMap
    >["restore"] = async (_fragment, snapshot) => {
      const to = snapshot.createdAt;
      const snapshotContent = await getContentAt(to);

      await yhubFetch(`${rollbackUrl}?from=${to}`, headers, {
        method: "POST",
        body: encodeAny({ from: to }) as BufferSource,
      });

      return snapshotContent;
    };

    /**
     * List all saved version snapshots (newest first), plus a synthetic
     * "current version" entry when the live document has unsaved edits.
     *
     * Filters the activity timeline to `type:version` markers, then resolves
     * author user-ids to usernames via the collaboration user store (exposed on
     * the {@link YSyncExtension}).
     */
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

      const snapshots = sortSnapshotsNewestFirst(
        entries
          .map(activityToSnapshot)
          .filter((s): s is VersionSnapshot => s !== undefined),
      );

      // Surface a "current version" entry when the live document has edits
      // beyond the most recent saved version. We fetch the single most recent
      // activity entry of *any* kind (no `type:version` filter): if its `to` is
      // newer than the latest version marker, there have been edits since, and
      // that entry also gives us the last-edit timestamp + author for the row.
      //
      // This only re-evaluates when `list()` runs (sidebar open / refresh),
      // which matches how YHub versions load today.
      const currentEntry = await getCurrentVersionEntry(
        snapshots[0]?.createdAt,
      );
      const all = currentEntry ? [currentEntry, ...snapshots] : snapshots;

      // Resolve the comma-separated author user-ids in each snapshot's
      // `secondaryLabel` (from YHub's `by` field) to usernames via the
      // collaboration user store, which is exposed on the YSync extension. With
      // no user store (or for ids it can't resolve), the raw id is kept.
      const userStore = editor.getExtension(AttributionExtension)?.userStore;
      if (!userStore) {
        return all;
      }

      const splitIds = (label: string | undefined) =>
        label
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [];

      await userStore.loadUsers([
        ...new Set(all.flatMap((s) => splitIds(s.secondaryLabel))),
      ]);

      return all.map((s) => {
        const ids = splitIds(s.secondaryLabel);
        if (ids.length === 0) {
          return s;
        }
        return {
          ...s,
          secondaryLabel: ids
            .map((id) => userStore.getUser(id)?.username ?? id)
            .join(", "),
        };
      });
    };

    return {
      list,
      create,
      getContent,
      getAttributions,
      restore,
    };
  };
}
