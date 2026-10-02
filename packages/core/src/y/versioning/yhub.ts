import * as Y from "@y/y";

import {
  VersioningEndpointsFactory,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "../../extensions/Versioning/index.js";
import { collectFragmentIds } from "../utils.js";
import {
  YHubClient,
  type YHubActivityEntry,
  type YHubClientOptions,
  type YHubQueryParams,
} from "./yhubClient.js";

/**
 * Options for creating a YHub versioning endpoints instance.
 * Restoration requires full-history read access (`GET /ydoc?gc=false`) and
 * rollback permission. Naming requires YHub history.version access and uses
 * the latest activity returned by YHub; it
 * does not flush pending collaboration updates or bypass YHub's response cache.
 */
export interface YHubVersioningOptions extends YHubClientOptions {
  /** Activity query overrides, read fresh on each request. */
  activityParams?: YHubQueryParams;
}

const ACTIVITY_PARAM_DEFAULTS: YHubQueryParams = {
  order: "desc",
  limit: 50,
  groupMaxGap: 60 * 60 * 1000, // Start a version after an hour of inactivity.
  groupMaxDuration: 12 * 60 * 60 * 1000, // Cap a version at twelve hours.
  // Group a session across authors; YHub's default keeps each author separate.
  groupByUser: false,
  // Include edit attribution pairs separately from native version custom data.
  customAttributions: true,
  versions: true,
};

/** Merge edit attribution pairs, dropping the result when it's empty. */
function mergeCustomAttributions(
  ...records: Array<Record<string, string> | undefined>
): Record<string, string> | undefined {
  const merged: Record<string, string> = Object.assign({}, ...records);
  return Object.keys(merged).length > 0 ? merged : undefined;
}

// YHub always produces an array of author IDs.
type YHubSnapshot<Metadata> = Omit<VersionSnapshot<Metadata>, "by"> & {
  by?: string[];
};

/** An activity window is identified by its end timestamp. */
function activityToSnapshot<Metadata>(
  entry: YHubActivityEntry<Metadata>,
): YHubSnapshot<Metadata> {
  const custom = entry.version?.custom;
  const restoredFrom =
    custom !== null && typeof custom === "object" && "restoredFrom" in custom
      ? custom.restoredFrom
      : undefined;
  return {
    id: String(entry.to),
    createdAt: entry.to,
    by: entry.by.length ? entry.by : undefined,
    name: entry.version?.name || undefined,
    restoredFrom:
      typeof restoredFrom === "number" && Number.isFinite(restoredFrom)
        ? { id: String(restoredFrom), createdAt: restoredFrom }
        : undefined,
    metadata: custom,
    customAttributions: mergeCustomAttributions(entry.customAttributions),
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
 * Adapts YHub's activity timeline (including native named versions) to versions.
 * The newest activity is current; version metadata lives in YHub, not the doc.
 */
export function createYHubVersioningEndpoints<Metadata = unknown>(
  options: YHubVersioningOptions,
): VersioningEndpointsFactory<Y.Node, Uint8Array, Y.ContentMap, Metadata> {
  const client = new YHubClient<Metadata>(options);

  return (editor) => {
    let listedCurrent: YHubSnapshot<Metadata> | undefined;

    function fetchActivity(overrides?: YHubQueryParams) {
      return client.getActivity({
        ...ACTIVITY_PARAM_DEFAULTS,
        ...options.activityParams,
        ...overrides,
        versions: true,
      });
    }

    async function fetchNewestEntry() {
      return (await fetchActivity({ limit: 1, order: "desc" }))[0];
    }

    async function getContentAt(to: number) {
      return Y.convertUpdateFormatV1ToV2(await client.getContent(to));
    }

    async function setName(t: number, name: string) {
      const existing = await client.getVersion(t);
      return existing
        ? client.updateVersion(existing, name)
        : client.createVersion(t, name);
    }

    return {
      async list() {
        const activity = await fetchActivity();

        const rows = new Map<number, YHubSnapshot<Metadata>>();
        for (const entry of activity) {
          const existing = rows.get(entry.to);
          const by = [...new Set([...(existing?.by ?? []), ...entry.by])];
          const row = activityToSnapshot(entry);
          rows.set(entry.to, {
            ...row,
            by: by.length ? by : undefined,
            name: entry.version
              ? entry.version.name || undefined
              : existing?.name,
            restoredFrom: entry.version
              ? row.restoredFrom
              : existing?.restoredFrom,
            metadata: entry.version ? row.metadata : existing?.metadata,
            customAttributions: mergeCustomAttributions(
              existing?.customAttributions,
              row.customAttributions,
            ),
          });
        }

        const newestActivityTo = Math.max(...rows.keys());

        const now = Date.now();
        const current = rows.get(newestActivityTo) ?? {
          id: String(now),
          createdAt: now,
        };
        rows.delete(Number(current.id));
        listedCurrent = current;
        return {
          current,
          snapshots: [...rows.values()].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        };
      },

      async create(_fragment, createOptions) {
        let current = listedCurrent;
        if (!current) {
          const newest = await fetchNewestEntry();
          if (!newest) {
            throw new Error(
              "Cannot name the current version: YHub has recorded no activity " +
                "for this document yet.",
            );
          }
          current = activityToSnapshot(newest);
        }

        // An omitted metadata value leaves native custom data untouched.
        if (createOptions.name || createOptions.metadata !== undefined) {
          const t = timestampId(current);
          const existing = await client.getVersion(t);
          const name = createOptions.name || existing?.name || "";
          const version = existing
            ? await client.updateVersion(existing, name, createOptions.metadata)
            : await client.createVersion(t, name, createOptions.metadata);
          current = activityToSnapshot({
            from: t,
            to: t,
            by: current.by ?? [],
            customAttributions: current.customAttributions ?? {},
            version,
          });
        }
        listedCurrent = current;
        return current;
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

        // Restore only this editor's fragment, preserving other editors.
        const contentIds = collectFragmentIds(fragment, document);

        // Pin the old head before rollback so YHub's activity grouping cannot
        // absorb it. An existing named version already cuts the activity there.
        if (before && !(await client.getVersion(before.to))) {
          await client.createVersion(
            before.to,
            editor.dictionary.versioning.before_restore,
          );
        }

        await client.rollback({
          // YHub includes the `from` millisecond. Keep the selected version's
          // final edit, reverting only edits strictly after its timestamp.
          from: to + 1,
          contentIds: Y.encodeContentIds({
            inserts: contentIds,
            deletes: contentIds,
          }),
        });

        return snapshotContent;
      },

      async rename(snapshot, name) {
        const t = timestampId(snapshot);
        if (name) {
          await setName(t, name);
        } else {
          const existing = await client.getVersion(t);
          if (existing) {
            await client.updateVersion(existing, "");
          }
        }
      },

      async remove(snapshot) {
        const existing = await client.getVersion(timestampId(snapshot));
        if (existing) {
          // Preserve custom metadata on a named version; otherwise drop it so
          // the automatic activity entry remains without a named version.
          if (existing.custom !== null && existing.custom !== undefined) {
            await client.updateVersion(existing, "");
          } else {
            await client.deleteVersion(existing);
          }
        }
      },
    } satisfies VersioningEndpoints<Y.Node, Uint8Array, Y.ContentMap, Metadata>;
  };
}
