import * as Y from "@y/y";
import { decodeAny, encodeAny } from "lib0/buffer";

import {
  VersioningEndpointsFactory,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";
import { YSyncExtension } from "../extensions/YSync.js";
import { collectFragmentIds } from "../utils.js";

/**
 * Name of the root {@link Y.Node} **array** on the live collaboration doc that
 * stores the document's named versions.
 *
 * An array rather than a map because Yjs map keys are never truly deleted —
 * removing a name would leave a tombstone behind. Each element is a plain
 * object keyed by the version's server timestamp ({@link YHubVersionEntry}), and
 * the *last* element for a given id wins, so an upsert is "delete the old
 * elements, push a new one".
 */
const VERSIONS_ARRAY = "__bn_versions";

/**
 * How long `restore` waits for YHub to index the rollback edit before giving
 * up on labelling the new head: a handful of short polls.
 */
const RESTORE_POLL_ATTEMPTS = 5;
const RESTORE_POLL_INTERVAL_MS = 250;

/**
 * One entry of the {@link VERSIONS_ARRAY} store: metadata layered on top of a
 * point in YHub's activity timeline.
 *
 * Only `id` is required. Any further keys are passed through to
 * {@link VersionSnapshot.metadata} untouched, so an application can store its
 * own per-version data here.
 */
type YHubVersionEntry = {
  /** The server timestamp (`to`) of the activity entry this labels. */
  id: number;
  /** The version's name. A version is "named" exactly when this is set. */
  name?: string;
  /**
   * When this version was produced by a restore, the `to` it was restored from.
   * A bare timestamp because that *is* the restored version's identity here —
   * {@link VersionSnapshot.restoredFrom} splits it back into an id and a date.
   */
  restoredFrom?: number;
} & Record<string, unknown>;

/**
 * Options for creating a YHub versioning endpoints instance.
 */
export interface YHubVersioningOptions {
  /**
   * Base URL of the YHub API, including the API prefix
   * (e.g. `"https://yhub.example.com/api"`).
   * Must **not** include a trailing slash.
   */
  baseUrl: string;

  /** YHub organisation identifier. */
  org: string;

  /** Document identifier within the organisation. */
  docId: string;

  /**
   * Optional headers to include in every request (e.g. authentication tokens).
   * Restoration requires full-history read access (`GET /ydoc?gc=false`) to
   * identify deleted content belonging to this editor, as well as rollback
   * permission.
   */
  headers?: Record<string, string>;

  /**
   * Query params for the activity request, merged over the defaults.
   * Any param the YHub activity API accepts can
   * go here; the ones BlockNote sets by default are:
   *
   * - `order`, `limit` — how much history to list, newest first.
   * - `groupMaxGap` — how long a pause starts a new version. An hour, which is
   *   roughly what Google Docs and Notion show.
   * - `groupMaxDuration` — how long one version may span, so an uninterrupted
   *   session still breaks up. Twelve hours.
   * - `mergeUsers` — whether adjacent edits by *different* users group together
   *   (their ids accumulate in the entry's `by`).
   *   TODO not in standard yhub, but it exists in our fork.
   * - `customAttributions` — surfaces an entry's tags as
   *   {@link VersionSnapshot.metadata}.
   *
   * Read fresh on every request, so mutating the object you passed in
   * reconfigures the next one.
   */
  activityParams?: Record<string, string>;
}

/**
 * The activity query params BlockNote sends unless
 * {@link YHubVersioningOptions.activityParams} overrides them. Product
 * configuration, not something to expose as a runtime control.
 */
const ACTIVITY_PARAM_DEFAULTS: Record<string, string> = {
  order: "desc",
  limit: "50",
  groupMaxGap: String(60 * 60 * 1000),
  groupMaxDuration: String(12 * 60 * 60 * 1000),
  mergeUsers: "true",
  customAttributions: "true",
};

/**
 * Shape of a single activity entry returned by the YHub
 * `GET /api/activity/v1/{org}/{docId}` endpoint (after `decodeAny`).
 */
interface YHubActivityEntry {
  /** Start of the change window (unix-ms timestamp). */
  from: number;
  /** End of the change window (unix-ms timestamp). */
  to: number;
  /** Comma separated list of user-ids that matches the attribution */
  by?: string;
  /**
   * Key-value pairs the application tagged these edits with (requested with
   * `customAttributions=true`). BlockNote writes none itself, but passes any it
   * finds through to {@link VersionSnapshot.metadata}.
   */
  customAttributions?: Array<{ k: string; v: string }>;
}

/**
 * Shape returned by the YHub `GET /api/changeset/v1/{org}/{docId}` endpoint
 * (after `decodeAny`).
 */
interface YHubChangeset {
  /** Full Y.Doc state at the `to` timestamp. */
  ydoc?: Uint8Array;
  /**
   * Encoded {@link Y.ContentMap} describing who authored each change in the
   * window and when. Present when the changeset is requested with
   * `attributions=true`.
   */
  attributions?: Uint8Array;
}

/** Shape returned by the YHub activity endpoint. */
interface YHubActivityResponse {
  activity: YHubActivityEntry[];
}

/** Fold an entry's attribution pairs into a record; later pairs win. */
function attributionsToMetadata(
  pairs: Array<{ k: string; v: string }> | undefined,
): Record<string, unknown> | undefined {
  if (!pairs || pairs.length === 0) {
    return undefined;
  }
  return Object.fromEntries(pairs.map(({ k, v }) => [k, v]));
}

/** Merge two metadata records, dropping the result when it's empty. */
function mergeMetadata(
  ...records: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged = Object.assign({}, ...records) as Record<string, unknown>;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Split an activity entry's comma-separated `by` into raw user ids. */
function splitBy(by: string | undefined): string[] {
  return (
    by
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * Convert a YHub activity entry into a {@link VersionSnapshot}.
 *
 * The entry's `to` is the version's identity: it's both the id (as a string)
 * and the timestamp the changeset endpoints resolve content from. The entry's
 * `by` user-ids are passed through raw — resolving them to user info is the
 * view layer's job.
 */
function activityToSnapshot(entry: YHubActivityEntry): VersionSnapshot {
  const by = splitBy(entry.by);
  return {
    id: String(entry.to),
    createdAt: entry.to,
    by: by.length > 0 ? by : undefined,
    metadata: attributionsToMetadata(entry.customAttributions),
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
 * YHub records a continuous activity timeline rather than discrete snapshots,
 * so **the newest activity entry is the current version** and every older entry
 * is an automatic version. Naming a version doesn't write to YHub at all: names
 * (and any other per-version metadata) live in a {@link VERSIONS_ARRAY} array on
 * the live collaboration doc, keyed by the entry's server timestamp. `list()`
 * makes a single activity request and overlays that array on the result.
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
 *         baseUrl: "https://yhub.example.com/api",
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
): VersioningEndpointsFactory<Y.Node, Uint8Array, Y.ContentMap> {
  const { baseUrl, org, docId, headers = {} } = options;

  const activityUrl = `${baseUrl}/activity/v1/${org}/${docId}`;
  const changesetUrl = `${baseUrl}/changeset/v1/${org}/${docId}`;
  const rollbackUrl = `${baseUrl}/rollback/v1/${org}/${docId}`;
  const documentUrl = `${baseUrl}/ydoc/v1/${org}/${docId}`;

  return (editor) => {
    /**
     * The named-version store on the live collaboration doc, or `undefined`
     * when there is no live doc yet (no `ySync` extension attached). Reads
     * tolerate that; writes go through {@link requireVersionsArray}.
     */
    function getVersionsArray(): Y.Node | undefined {
      const doc =
        editor.getExtension<typeof YSyncExtension>("ySync")?.fragment.doc;
      return doc?.get(VERSIONS_ARRAY);
    }

    function requireVersionsArray(): Y.Node {
      const array = getVersionsArray();
      if (!array) {
        throw new Error(
          "Cannot write version metadata: no live collaboration document is " +
            "available.",
        );
      }
      return array;
    }

    /**
     * Every stored entry, keyed by version id. When several elements share an
     * id the **last** one wins — that's what makes appending an upsert, and
     * makes concurrent edits converge on the same winner for every peer.
     */
    function readEntries(): Map<number, YHubVersionEntry> {
      const entries = new Map<number, YHubVersionEntry>();
      const array = getVersionsArray();
      if (!array) {
        return entries;
      }
      for (const element of array.toArray() as unknown[]) {
        if (typeof element !== "object" || element === null) {
          continue;
        }
        const entry = element as Partial<YHubVersionEntry>;
        if (typeof entry.id !== "number") {
          continue;
        }
        entries.set(entry.id, entry as YHubVersionEntry);
      }
      return entries;
    }

    /** Drop every element with this id. Returns the number removed. */
    function deleteEntryElements(array: Y.Node, id: number): number {
      const elements = array.toArray() as unknown[];
      let removed = 0;
      // Back to front so the indices of the not-yet-visited elements hold.
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (
          typeof element === "object" &&
          element !== null &&
          (element as Partial<YHubVersionEntry>).id === id
        ) {
          array.delete(i, 1);
          removed++;
        }
      }
      return removed;
    }

    function upsertEntry(entry: YHubVersionEntry) {
      const array = requireVersionsArray();
      // One transaction, so peers observe the delete and the push as a single
      // change rather than a beat in which the entry is nowhere at all.
      array.doc!.transact(() => {
        deleteEntryElements(array, entry.id);
        array.push([entry] as never);
      });
    }

    function deleteEntry(id: number) {
      deleteEntryElements(requireVersionsArray(), id);
    }

    /**
     * The activity query params: the defaults, the caller's overrides, then
     * whatever this particular request needs. `options.activityParams` is read
     * fresh every time, so mutating the object passed in reconfigures the next
     * request.
     */
    async function fetchActivity(
      overrides?: Record<string, string>,
    ): Promise<YHubActivityEntry[]> {
      const params = new URLSearchParams({
        ...ACTIVITY_PARAM_DEFAULTS,
        // YHub caches activity by its query window. A fresh upper bound lets
        // refreshes and restore polling observe edits made since the last
        // request instead of reusing the server's cached pre-restore head.
        to: String(Date.now()),
        ...options.activityParams,
        ...overrides,
      });
      const buf = await yhubFetch(`${activityUrl}?${params}`, headers);
      return (decodeAny(new Uint8Array(buf)) as YHubActivityResponse).activity;
    }

    /**
     * The newest activity entry — the current version. `undefined` only for a
     * document YHub has recorded no activity for at all.
     */
    async function fetchNewestEntry(): Promise<YHubActivityEntry | undefined> {
      // `order` forced rather than inherited: the caller's `activityParams`
      // may list oldest-first, but this must always be the *newest* entry.
      const activity = await fetchActivity({ limit: "1", order: "desc" });
      return activity[0];
    }

    /**
     * The newest activity entry once it is newer than `after` — i.e. once YHub
     * has indexed an edit we know we just made. The activity timeline can lag
     * a write by a beat, so this polls (briefly) rather than trusting the
     * first answer. `undefined` when it never shows up.
     */
    async function waitForEntryAfter(
      after: number | undefined,
    ): Promise<YHubActivityEntry | undefined> {
      for (let attempt = 0; attempt < RESTORE_POLL_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, RESTORE_POLL_INTERVAL_MS),
          );
        }
        const newest = await fetchNewestEntry();
        if (newest && (after === undefined || newest.to > after)) {
          return newest;
        }
      }
      return undefined;
    }

    /**
     * Reconstruct the full document state as it was at a given `to` timestamp.
     *
     * The changeset endpoint builds `ydoc` purely from the `to` timestamp
     * range, so historical document state can only be retrieved by timestamp,
     * never by a version id (which is why version ids *are* timestamps here).
     */
    async function getContentAt(to: number): Promise<Uint8Array> {
      const params = new URLSearchParams({
        ydoc: "true",
        to: String(to),
      });

      const buf = await yhubFetch(`${changesetUrl}?${params}`, headers);
      const changeset = decodeAny(new Uint8Array(buf)) as YHubChangeset;

      if (!changeset.ydoc) {
        throw new Error(`YHub returned no document state at timestamp ${to}.`);
      }

      return Y.convertUpdateFormatV1ToV2(changeset.ydoc);
    }

    /** Reject invalid ids before they become unmatchable NaN metadata keys. */
    function requireTimestampId(snapshot: VersionSnapshot): number {
      const id = Number(snapshot.id);
      if (!Number.isFinite(id)) {
        throw new Error(
          `Version id "${snapshot.id}" is not a YHub server timestamp.`,
        );
      }
      return id;
    }

    function setVersionName(
      snapshot: VersionSnapshot,
      name: string | undefined,
    ) {
      const id = requireTimestampId(snapshot);
      const existing = readEntries().get(id);
      const next: YHubVersionEntry = {
        ...existing,
        id,
        name: name === undefined || name === "" ? undefined : name,
      };
      if (next.name === undefined) {
        delete next.name;
      }
      if (Object.keys(next).length === 1) {
        deleteEntry(id);
        return;
      }
      upsertEntry(next);
    }

    return {
      /**
       * List the document's versions from a single activity request.
       *
       * Activity entries sharing a `to` are merged into one row (their authors
       * unioned), then the {@link VERSIONS_ARRAY} entries are overlaid on the
       * matching rows — an entry with no matching activity becomes a row of its
       * own. The newest *activity* entry is the current version; an array entry
       * with a newer timestamp (which shouldn't happen, but is representable)
       * still sorts below it rather than displacing it.
       */
      async list() {
        const activity = await fetchActivity();

        const rows = new Map<number, VersionSnapshot>();
        for (const entry of activity) {
          const existing = rows.get(entry.to);
          if (!existing) {
            rows.set(entry.to, activityToSnapshot(entry));
            continue;
          }
          // Same `to`: one version, several attributions. Union the authors.
          const by = new Set([
            ...(Array.isArray(existing.by)
              ? existing.by
              : existing.by
                ? [existing.by]
                : []),
            ...splitBy(entry.by),
          ]);
          rows.set(entry.to, {
            ...existing,
            by: by.size > 0 ? [...by] : undefined,
            metadata: mergeMetadata(
              existing.metadata,
              attributionsToMetadata(entry.customAttributions),
            ),
          });
        }

        // The current version is the newest recorded edit.
        const newestActivityTo = activity.reduce<number | undefined>(
          (newest, entry) =>
            newest === undefined || entry.to > newest ? entry.to : newest,
          undefined,
        );

        for (const [id, entry] of readEntries()) {
          const { id: _id, name, restoredFrom, ...metadata } = entry;
          const row = rows.get(id) ?? { id: String(id), createdAt: id };
          rows.set(id, {
            ...row,
            name,
            // The stored `to` is the restored version's whole identity here.
            restoredFrom:
              restoredFrom === undefined
                ? undefined
                : { id: String(restoredFrom), createdAt: restoredFrom },
            metadata: mergeMetadata(row.metadata, metadata),
          });
        }

        const sorted = [...rows.values()].sort(
          (a, b) => b.createdAt - a.createdAt,
        );

        const now = Date.now();
        const current = (newestActivityTo !== undefined
          ? sorted.find((row) => row.createdAt === newestActivityTo)
          : undefined) ??
          // No recorded activity at all (a document nobody has edited yet). The
          // client clock is the only timestamp available; nothing reads it back
          // beyond rendering the row, and there is no history to diff against.
          // Read once: the id and the timestamp must agree.
          { id: String(now), createdAt: now };

        return {
          current,
          snapshots: sorted.filter((row) => row.id !== current.id),
        };
      },

      /**
       * Name the current version: look up the newest activity entry and upsert a
       * {@link VERSIONS_ARRAY} entry against its timestamp. Nothing is written to
       * YHub — the version already exists in the activity timeline; this only
       * labels it. An empty name labels nothing: no entry is written.
       */
      async create(_fragment, createOptions) {
        // Fail before the fetch when there's nothing to write the name into.
        requireVersionsArray();

        const newest = await fetchNewestEntry();
        if (!newest) {
          throw new Error(
            "Cannot name the current version: YHub has recorded no activity " +
              "for this document yet.",
          );
        }

        const existing = readEntries().get(newest.to);
        const name = createOptions.name === "" ? undefined : createOptions.name;
        if (name === undefined) {
          // Saving unnamed must preserve any existing name on the newest edit.
          return { ...activityToSnapshot(newest), name: existing?.name };
        }
        upsertEntry({ ...existing, id: newest.to, name });

        return {
          ...activityToSnapshot(newest),
          name,
        };
      },

      /**
       * Fetch the full document content for a version.
       *
       * The version's `createdAt` is the activity entry's `to` timestamp, which
       * is exactly what the changeset API needs.
       */
      async getContent(snapshot) {
        return getContentAt(snapshot.createdAt);
      },

      /**
       * Fetch the authorship attributions for the changes between two versions
       * (or from the start of the document when `compareTo` is omitted).
       *
       * Both preview kinds carry a server `to` in `createdAt` — the current
       * version's is the newest activity entry's — so no activity lookup is
       * needed to resolve the changeset window.
       */
      async getAttributions(target, compareTo) {
        const to = target.snapshot.createdAt;
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
            `YHub returned no attributions for version ${target.snapshot.id}.`,
          );
        }

        return Y.decodeContentMap(changeset.attributions);
      },

      /**
       * Restore the document to a version: fetch its content, roll everything
       * after it back, then mark the resulting new head as "restored from" that
       * version.
       *
       * The pre-restore state is pinned as its own "Before restore" row, so it
       * stays reachable even when activity grouping folds the rollback into the
       * row that held it.
       */
      async restore(fragment, snapshot) {
        const to = snapshot.createdAt;
        // The head before the rollback, so the head after it can be told apart
        // from a timeline that hasn't indexed the rollback yet.
        const [snapshotContent, before, documentBuffer] = await Promise.all([
          getContentAt(to),
          fetchNewestEntry(),
          // Deleted subtrees may already be garbage-collected on the client.
          // The server's retained history lets us scope both insertions and
          // deletions to this editor's fragment, preserving version metadata
          // and any other editors sharing the same Y.Doc.
          yhubFetch(`${documentUrl}?gc=false`, headers),
        ]);

        const document = decodeAny(new Uint8Array(documentBuffer)) as {
          doc: Uint8Array;
        };
        // Scope both insertions to undo and deletions to restore to this fragment.
        // The rollback timestamp separately selects which changes to undo.
        const contentIds = collectFragmentIds(fragment, document.doc);

        await yhubFetch(rollbackUrl, headers, {
          method: "POST",
          // YHub includes the `from` millisecond. Keep the selected version's
          // final edit, reverting only edits strictly after its timestamp.
          body: encodeAny({
            from: to + 1,
            contentIds: Y.encodeContentIds({
              inserts: contentIds,
              deletes: contentIds,
            }),
          }) as BufferSource,
        });

        // The rollback is itself an edit, so once indexed it is the newest entry:
        // the restored state. Label it, so the sidebar can show "Restored from
        // <date>". Labelling whatever is newest *right now* could stamp the
        // pre-restore head instead.
        const newest = await waitForEntryAfter(before?.to);
        if (newest) {
          // Pin the old head so activity grouping cannot fold it into the rollback.
          // An existing metadata entry already preserves it.
          if (before && !readEntries().has(before.to)) {
            upsertEntry({ id: before.to, name: "Before restore" });
          }
          const existing = readEntries().get(newest.to);
          upsertEntry({ ...existing, id: newest.to, restoredFrom: to });
        }

        return snapshotContent;
      },

      /**
       * Rename a version by upserting its {@link VERSIONS_ARRAY} entry.
       *
       * An empty or `undefined` name clears the name (the row stays as an
       * automatic version) while keeping any other metadata; when that leaves the
       * entry with nothing but its id, the entry is dropped entirely.
       */
      async rename(snapshot, name) {
        setVersionName(snapshot, name);
      },

      /**
       * Remove a version's stored entry. For YHub the underlying activity is
       * immutable, so the row itself stays — it just becomes automatic again (or
       * disappears when it had no activity entry behind it).
       */
      async remove(snapshot) {
        // Deleting a stored version clears its name, preserving restore and
        // application metadata. Automatic versions have nothing to remove.
        if (readEntries().has(requireTimestampId(snapshot))) {
          setVersionName(snapshot, undefined);
        }
      },
    } satisfies VersioningEndpoints<Y.Node, Uint8Array, Y.ContentMap>;
  };
}
