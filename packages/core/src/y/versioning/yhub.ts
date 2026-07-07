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
import { YCursorExtension } from "../extensions/YCursorPlugin.js";
import { YSyncExtension } from "../extensions/YSync.js";

/**
 * Name of the root {@link Y.Type} map on the live collaboration doc that stores
 * a mutable `versionId -> name` mapping. Because YHub attributions are
 * immutable, version names that need to be editable (renamed) live here on the
 * Y.Doc instead of (or in addition to) the immutable `name` attribution.
 */
const VERSION_NAMES_MAP = "__bn_version_names";

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

  /**
   * When set, forwarded as the `group` query param to the YHub activity API,
   * controlling whether adjacent edits are grouped into single entries.
   */
  group?: boolean;

  /**
   * Maximum gap (in ms) between edits for them to be grouped together.
   * Forwarded as the `groupMaxGap` query param.
   * @default 10000
   */
  groupMaxGap?: number;

  /**
   * Maximum total duration (in ms) a single group of edits may span.
   * When set, forwarded as the `groupMaxDuration` query param.
   */
  groupMaxDuration?: number;
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
 * Whether an activity entry is a version marker (created with a `type:version`
 * custom attribution) as opposed to a plain edit.
 */
function isVersionEntry(entry: YHubActivityEntry): boolean {
  return (
    entry.customAttributions?.some(
      (a) => a.k === "type" && a.v === "version",
    ) ?? false
  );
}

/**
 * Convert a YHub activity entry into a {@link VersionSnapshot}.
 *
 * Version markers (entries with a `type:version` custom attribution) map to
 * named snapshots: the `id` attribution becomes the snapshot identifier and the
 * `name` attribution its name. Any other (plain edit) entry maps to a
 * history-only snapshot with a synthetic `history-<to>-<index>` id and no name.
 * In both cases the entry's `by` user-ids are passed through raw on
 * {@link VersionSnapshot.by} — resolving them to user info is the view layer's
 * job.
 *
 * The history id embeds the entry's `index` within the activity response
 * because YHub can emit multiple activity entries sharing the same `to`
 * timestamp (e.g. distinct same-`insertAt` patches that grouping did not merge),
 * and `to` alone would then produce colliding `history-<to>` ids — duplicate
 * React keys in the sidebar. The `index` disambiguates them. The changeset
 * lookups (`getContent`/`getAttributions`/`restore`) key off
 * {@link VersionSnapshot.createdAt} (= `entry.to`), never the id, so embedding
 * the index in the id is safe.
 */
function activityToSnapshot(
  entry: YHubActivityEntry,
  index: number,
): VersionSnapshot | undefined {
  const by = entry.by
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const byField = by && by.length > 0 ? by : undefined;

  if (isVersionEntry(entry)) {
    const id = entry.customAttributions?.find((a) => a.k === "id")?.v;
    if (id === undefined) {
      return undefined;
    }
    const attributionName = entry.customAttributions?.find(
      (a) => a.k === "name",
    )?.v;
    return {
      id,
      name: attributionName,
      createdAt: entry.to,
      updatedAt: entry.to,
      by: byField,
    };
  }

  return {
    id: `history-${entry.to}-${index}`,
    createdAt: entry.to,
    updatedAt: entry.to,
    by: byField,
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
 * (`type:version` + an optional `name`). The `list` endpoint returns the full
 * activity timeline, mapping `type:version` markers to named versions and every
 * other entry to a history-only snapshot, so the sidebar can show both the
 * named versions and the complete edit history.
 *
 * A version's id lives in immutable YHub attributions (`type:version` + `id`),
 * so it is fixed at creation time. Version *names*, however, are stored in a
 * mutable `__bn_version_names` map on the live collaboration doc (see
 * {@link VERSION_NAMES_MAP}), so `rename` is supported and simply updates that
 * store.
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
  const {
    baseUrl,
    org,
    docId,
    headers = {},
    activityLimit = 50,
    group,
  } = options;

  const activityUrl = `${baseUrl}/activity/${org}/${docId}`;
  const changesetUrl = `${baseUrl}/changeset/${org}/${docId}`;
  const rollbackUrl = `${baseUrl}/rollback/${org}/${docId}`;

  return (editor) => {
    /**
     * The mutable per-id version-name store on the live collaboration doc.
     *
     * Returns the root {@link VERSION_NAMES_MAP} map-typed {@link Y.Type}, which
     * uses `setAttr`/`getAttr` for keyed access (this Yjs fork has a single
     * unified `Y.Type` rather than a distinct `Y.Map`). `undefined` until the
     * live doc has been captured from a `create` call.
     */
    const getVersionNamesMap = (): Y.Type | undefined => {
      const fragment =
        editor.getExtension<typeof YSyncExtension>("ySync")?.fragment.doc;
      // `fragment` is undefined until the live doc has been captured (e.g. no
      // ySync extension attached yet); return undefined rather than throwing so
      // callers can gracefully fall back to the immutable name attribution.
      return fragment?.get(VERSION_NAMES_MAP);
    };

    /**
     * Build the synthetic "current version" snapshot, or `undefined` when the
     * live document matches the latest saved version (no edits since).
     */
    const getCurrentVersionEntry = async (
      /**
       * The `to` timestamp of the most recent version marker, or `undefined`
       * when no versions exist yet.
       */
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

      // Build the synthetic entry directly rather than via `activityToSnapshot`,
      // whose `id` comes from a string-typed wire attribution — the current
      // entry's id is the `CURRENT_VERSION_ID` symbol, not a real version id.
      const by =
        latestEdit.by
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [];
      return {
        id: CURRENT_VERSION_ID,
        createdAt: latestEdit.to,
        updatedAt: latestEdit.to,
        by: by.length > 0 ? by : undefined,
      };
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

      if (options?.name) {
        getVersionNamesMap()?.setAttr(id, options.name);
      }

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
        by: user?.id,
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
          `YHub returned no attributions for snapshot ${String(snapshot.id)}.`,
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
     * Rename a saved version by updating its entry in the mutable
     * {@link VERSION_NAMES_MAP} store on the live collaboration doc.
     *
     * The version's `id` remains fixed in its immutable YHub attributions —
     * only the editable name in the map is changed. Passing an empty or
     * `undefined` name clears the entry (falling back to the immutable `name`
     * attribution captured at creation time).
     */
    const rename: VersioningEndpoints<
      Y.Type,
      Uint8Array,
      Y.ContentMap
    >["rename"] = async (snapshot, name) => {
      if (typeof snapshot.id !== "string") {
        // CURRENT_VERSION_ID (symbol) is not renameable.
        return;
      }
      const map = getVersionNamesMap();
      if (!map) {
        throw new Error(
          "Cannot rename version: no live collaboration document is available.",
        );
      }
      if (name === undefined || name === "") {
        map.deleteAttr(snapshot.id);
      } else {
        map.setAttr(snapshot.id, name);
      }
    };

    /**
     * List the full version timeline (newest first), plus a synthetic
     * "current version" entry when the live document has unsaved edits.
     *
     * Returns the entire activity timeline: `type:version` markers are mapped
     * to named snapshots and every other entry to a history-only snapshot (see
     * {@link activityToSnapshot}), so the sidebar can offer both a "named
     * versions" and a full "history" view. Author user-ids are passed through
     * raw on {@link VersionSnapshot.by} — the view layer resolves them to user
     * info via the versioning extension's user store.
     */
    const list: VersioningEndpoints<
      Y.Type,
      Uint8Array,
      Y.ContentMap
    >["list"] = async () => {
      // Read the grouping knobs fresh from `options` so a caller mutating the
      // object it passed in reconfigures grouping on the next refresh (see the
      // note where these are deliberately left out of the destructure above).
      const groupMaxGap = options.groupMaxGap ?? 10000;
      const groupMaxDuration = options.groupMaxDuration;

      const params = new URLSearchParams({
        order: "desc",
        limit: String(activityLimit),
        customAttributions: "true",
      });
      // Always send a concrete `groupMaxGap`. Sending
      // `String(undefined)` here would make the server `parseInt("undefined")`
      // to NaN, silently disabling grouping — which surfaces every same-`to`
      // attribution as its own history entry and produces duplicate React keys.
      params.set("groupMaxGap", String(groupMaxGap));
      if (group !== undefined) {
        params.set("group", String(group));
      }
      if (groupMaxDuration !== undefined) {
        params.set("groupMaxDuration", String(groupMaxDuration));
      }

      const buf = await yhubFetch(`${activityUrl}?${params}`, headers);
      const entries = decodeAny(new Uint8Array(buf)) as YHubActivityEntry[];

      const snapshots = sortSnapshotsNewestFirst(
        entries
          .map((entry, i) => activityToSnapshot(entry, i))
          .filter((s): s is VersionSnapshot => s !== undefined)
          // Prefer the mutable per-id name from the live doc's
          // `__bn_version_names` store over the immutable `name` attribution,
          // so renames (which only mutate that store) are reflected here.
          .map((snapshot) => {
            const attributionName = snapshot.name;
            const mappedName =
              (typeof snapshot.id === "string"
                ? (getVersionNamesMap()?.getAttr(snapshot.id) as
                    | string
                    | undefined)
                : undefined) ?? attributionName;
            return { ...snapshot, name: mappedName };
          }),
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
      return currentEntry ? [currentEntry, ...snapshots] : snapshots;
    };

    return {
      list,
      create,
      getContent,
      getAttributions,
      restore,
      rename,
    };
  };
}
