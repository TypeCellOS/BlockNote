import * as Y from "@y/y";

import {
  VersioningEndpointsFactory,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";
import { YSyncExtension } from "../extensions/YSync.js";
import { collectFragmentIds } from "../utils.js";
import { YHubVersionStore } from "./YHubVersionStore.js";
import {
  YHubClient,
  type YHubActivityEntry,
  type YHubClientOptions,
  type YHubQueryParams,
} from "./yhubClient.js";

/**
 * Options for creating a YHub versioning endpoints instance.
 * Restoration requires full-history read access (`GET /ydoc?gc=false`) and
 * rollback permission. Naming uses the latest activity returned by YHub; it
 * does not flush pending collaboration updates or bypass YHub's response cache.
 */
export interface YHubVersioningOptions extends YHubClientOptions {
  /** Activity query overrides, read fresh on each request. */
  activityParams?: YHubQueryParams;
  /**
   * One best-effort history refresh after restore. Defaults to 6000ms, just
   * beyond YHub's default cache lifetime; increase for longer server caches.
   */
  refreshAfterRestoreMs?: number;
}

const ACTIVITY_PARAM_DEFAULTS: YHubQueryParams = {
  order: "desc",
  limit: 50,
  groupMaxGap: 60 * 60 * 1000, // Start a version after an hour of inactivity.
  groupMaxDuration: 12 * 60 * 60 * 1000, // Cap a version at twelve hours.
  mergeUsers: true, // Supported by our YHub fork.
  customAttributions: true,
};

/** Merge two metadata records, dropping the result when it's empty. */
function mergeMetadata(
  ...records: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged = Object.assign({}, ...records) as Record<string, unknown>;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

// YHub always produces an array of author IDs.
type YHubSnapshot = Omit<VersionSnapshot, "by"> & { by?: string[] };

/** An activity window is identified by its end timestamp. */
function activityToSnapshot(entry: YHubActivityEntry): YHubSnapshot {
  return {
    id: String(entry.to),
    createdAt: entry.to,
    by: entry.by.length ? entry.by : undefined,
    metadata: mergeMetadata(entry.customAttributions),
  };
}

function timestampId(snapshot: VersionSnapshot): number {
  const id = Number(snapshot.id);
  if (!Number.isFinite(id)) {
    throw new Error(
      `Version id "${snapshot.id}" is not a YHub server timestamp.`,
    );
  }
  return id;
}

/**
 * Adapts YHub's activity timeline to versions. The newest activity is current;
 * names and restore labels are stored separately in the collaboration document.
 */
export function createYHubVersioningEndpoints(
  options: YHubVersioningOptions,
): VersioningEndpointsFactory<Y.Node, Uint8Array, Y.ContentMap> {
  const client = new YHubClient(options);

  return (editor) => {
    const versions = new YHubVersionStore(
      () =>
        editor.getExtension<typeof YSyncExtension>("ySync")?.fragment.doc as
          | Y.Doc
          | undefined,
    );

    function fetchActivity(overrides?: YHubQueryParams) {
      return client.getActivity({
        ...ACTIVITY_PARAM_DEFAULTS,
        ...options.activityParams,
        ...overrides,
      });
    }

    async function fetchNewestEntry() {
      return (await fetchActivity({ limit: 1, order: "desc" }))[0];
    }

    async function getContentAt(to: number) {
      return Y.convertUpdateFormatV1ToV2(await client.getContent(to));
    }

    return {
      refreshAfterRestoreMs: options.refreshAfterRestoreMs ?? 6000,
      async list() {
        const activity = await fetchActivity();

        const rows = new Map<number, YHubSnapshot>();
        for (const entry of activity) {
          const existing = rows.get(entry.to);
          const by = [...new Set([...(existing?.by ?? []), ...entry.by])];
          rows.set(entry.to, {
            ...activityToSnapshot(entry),
            by: by.length ? by : undefined,
            metadata: mergeMetadata(
              existing?.metadata,
              entry.customAttributions,
            ),
          });
        }

        // Stored labels can have newer timestamps, but only activity defines current.
        const newestActivityTo = Math.max(...rows.keys());

        for (const [id, entry] of versions.readEntries()) {
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

        const now = Date.now();
        const current = rows.get(newestActivityTo) ?? {
          id: String(now),
          createdAt: now,
        };
        rows.delete(Number(current.id));
        return {
          current,
          snapshots: [...rows.values()].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        };
      },

      async create(_fragment, createOptions) {
        // Fail before the fetch when there's nothing to write the name into.
        versions.getArray();

        const newest = await fetchNewestEntry();
        if (!newest) {
          throw new Error(
            "Cannot name the current version: YHub has recorded no activity " +
              "for this document yet.",
          );
        }

        // Saving unnamed preserves any existing name on the newest edit.
        if (createOptions.name) {
          versions.setName(newest.to, createOptions.name);
        }
        return {
          ...activityToSnapshot(newest),
          name: versions.readEntries().get(newest.to)?.name,
        };
      },

      async getContent(snapshot) {
        return getContentAt(snapshot.createdAt);
      },

      async getAttributions(target, compareTo) {
        // Current previews include live edits beyond the last list response.
        return Y.decodeContentMap(
          await client.getAttributions(
            compareTo?.createdAt ?? 0,
            target.kind === "snapshot" ? target.snapshot.createdAt : undefined,
          ),
        );
      },

      async restore(fragment, snapshot) {
        const to = snapshot.createdAt;
        const [snapshotContent, before, document] = await Promise.all([
          getContentAt(to),
          fetchNewestEntry(),
          // Retained history includes deleted subtrees missing from the live doc.
          client.getDocument({ gc: false }),
        ]);

        // Restore only this editor's fragment, preserving other editors and metadata.
        const contentIds = collectFragmentIds(fragment, document);

        await client.rollback({
          // YHub includes the `from` millisecond. Keep the selected version's
          // final edit, reverting only edits strictly after its timestamp.
          from: to + 1,
          contentIds: Y.encodeContentIds({
            inserts: contentIds,
            deletes: contentIds,
          }),
        });

        // Keep the last observed head reachable even if grouping absorbs the rollback.
        if (before && !versions.readEntries().has(before.to)) {
          versions.upsertEntry({ id: before.to, name: "Before restore" });
        }
        // A newer activity entry could be
        // another user's edit, so it cannot reliably identify this rollback.

        return snapshotContent;
      },

      async rename(snapshot, name) {
        versions.setName(timestampId(snapshot), name);
      },

      async remove(snapshot) {
        // Deleting a stored version clears its name, preserving restore and
        // application metadata. Automatic versions have nothing to remove.
        const id = timestampId(snapshot);
        if (versions.readEntries().has(id)) {
          versions.setName(id, undefined);
        }
      },
    } satisfies VersioningEndpoints<Y.Node, Uint8Array, Y.ContentMap>;
  };
}
