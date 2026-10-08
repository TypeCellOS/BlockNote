import * as Y from "@y/y";
import type {
  VersionSnapshot,
  VersionStorage,
} from "../../extensions/Versioning/types.js";
import { collectFragmentIds, findTypeInOtherYdoc } from "../utils.js";
import { CollaborationExtension } from "../extensions/index.js";
import { createYVersionView } from "../extensions/Versioning.js";
import { createVersioningExtension } from "../../extensions/Versioning/Versioning.js";
import {
  YHubClient,
  type YHubClientOptions,
  type YHubQueryParams,
} from "./yhubClient.js";

export interface YHubVersionStorageOptions extends YHubClientOptions {
  /** Activity grouping and filters. `limit` is the page size, defaulting to 50. History is newest first. */
  activityParams?: YHubQueryParams;
}

type YHubStorage = VersionStorage<Uint8Array, Y.ContentMap> &
  Required<
    Pick<
      VersionStorage<Uint8Array, Y.ContentMap>,
      "getAttributions" | "create" | "restore" | "rename" | "remove"
    >
  >;

/** Configure Y14 history independently of collaboration installation. */
export function YVersioningExtension(options: {
  storage: VersionStorage<Uint8Array, Y.ContentMap>;
  scrollToFirstChange?: boolean;
}) {
  return createVersioningExtension((editor) => {
    const collaboration = editor.getExtension(CollaborationExtension);
    if (!collaboration) {
      throw new Error("Y14 versioning requires Y14 collaboration");
    }
    return {
      adapter: createYVersionView(editor, collaboration.fragment),
      storage: options.storage,
      resolveUsers: collaboration.userStore,
      scrollToFirstChange: options.scrollToFirstChange,
    };
  })();
}

/** Install YHub history for the editor's live collaboration document. */
export function YHubVersioningExtension(
  options: YHubVersionStorageOptions & { scrollToFirstChange?: boolean },
) {
  return createVersioningExtension((editor) => {
    const collaboration = editor.getExtension(CollaborationExtension);
    if (!collaboration) {
      throw new Error("Y14 versioning requires Y14 collaboration");
    }
    return {
      adapter: createYVersionView(editor, collaboration.fragment),
      storage: createYHubVersionStorage({
        ...options,
        fragment: collaboration.fragment,
        beforeRestoreName: editor.dictionary.versioning.before_restore,
      }),
      resolveUsers: collaboration.userStore,
      scrollToFirstChange: options.scrollToFirstChange,
    };
  })();
}

/** Continuous history for a live fragment, with no editor dependency. */
export function createYHubVersionStorage(
  options: YHubVersionStorageOptions & {
    fragment: Y.Node;
    beforeRestoreName: string;
  },
): YHubStorage {
  const { fragment, beforeRestoreName } = options;
  const client = new YHubClient(options);
  function timestamps(id: string) {
    const parts = id.split("-");
    const from = Number(parts[0]);
    const to = Number(parts[1]);
    if (
      parts.length !== 2 ||
      parts.some((part) => part.length === 0) ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from > to
    ) {
      throw new Error("Invalid YHub checkpoint identifier");
    }
    return { from, to };
  }
  function getHistoryList(signal?: AbortSignal, overrides?: YHubQueryParams) {
    return client.getActivity(activityParams(overrides), signal);
  }
  function activityParams(overrides?: YHubQueryParams): YHubQueryParams {
    return {
      order: "desc",
      limit: 50,
      groupMaxGap: 60 * 60 * 1000,
      groupMaxDuration: 12 * 60 * 60 * 1000,
      groupByUser: false,
      customAttributions: true,
      ...options.activityParams,
      ...overrides,
      versions: true,
    };
  }
  return {
    showCurrentVersion: false,
    historyIncludesBeginning: true,
    async list(signal, cursor) {
      const params =
        cursor === undefined
          ? { ...activityParams(), order: "desc" }
          : Object.fromEntries(new URLSearchParams(cursor));
      const limit = Number(params.limit);
      if (!Number.isSafeInteger(limit) || limit <= 0) {
        throw new Error("YHub activity limit must be a positive integer");
      }
      const [result, firstSnapshotResult] = await Promise.all([
        client.getActivity({ ...params, limit: limit + 1 }, signal),
        cursor === undefined
          ? client.getActivity(
              {
                from: 0,
                order: "asc",
                limit: 1,
                group: false,
                versions: true,
                customAttributions: true,
              },
              signal,
            )
          : undefined,
      ]);
      if (!result.ok) {
        return result;
      }
      if (firstSnapshotResult && !firstSnapshotResult.ok) {
        return firstSnapshotResult;
      }
      const entries = result.value.slice(0, limit);
      const oldest = entries.at(-1);
      let nextCursor: string | undefined;
      if (result.value.length > limit && oldest && oldest.from > 0) {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined) {
            query.set(key, String(value));
          }
        }
        query.set("to", String(oldest.from - 1));
        nextCursor = query.toString();
      }
      // The pinned beginning is not part of the page boundary.
      const firstSnapshot = firstSnapshotResult?.value[0];
      if (
        firstSnapshot &&
        !entries.some((entry) => entry.to === firstSnapshot.to)
      ) {
        entries.push(firstSnapshot);
      }
      return {
        ok: true,
        value: {
          nextCursor,
          snapshots: entries.map((entry): VersionSnapshot => {
            const custom = entry.version?.custom;
            const restoredFrom =
              custom !== null &&
              typeof custom === "object" &&
              "restoredFrom" in custom
                ? custom.restoredFrom
                : undefined;
            return {
              id: `${entry.from}-${entry.to}`,
              createdAt: entry.to,
              by: entry.by,
              name: entry.version?.name || undefined,
              metadata: custom,
              customAttributions: entry.customAttributions,
              restoredFrom:
                typeof restoredFrom === "number" &&
                Number.isFinite(restoredFrom)
                  ? {
                      id: `${entries.find((entry) => entry.to === restoredFrom)?.from ?? restoredFrom}-${restoredFrom}`,
                      createdAt: restoredFrom,
                    }
                  : undefined,
            };
          }),
        },
      };
    },
    async getContent(id, signal, { baseline = false } = {}) {
      const { from, to } = timestamps(id);
      // YHub includes edits at `to`. A baseline must precede the first edit in
      // the window; the attribution query below still includes that edit at `from`.
      const result = await client.getContent(
        baseline ? Math.max(0, from - 1) : to,
        signal,
      );
      return result.ok
        ? { ok: true, value: Y.convertUpdateFormatV1ToV2(result.value) }
        : result;
    },
    async getAttributions(target, baselineId, _capturedAt, signal) {
      const { from } = timestamps(baselineId);
      const result = await client.getAttributions(
        from,
        // Use the server's current time, not the potentially skewed client clock.
        target.type === "current" ? undefined : timestamps(target.id).to,
        signal,
      );
      return result.ok
        ? { ok: true, value: Y.decodeContentMap(result.value) }
        : result;
    },
    async create(content, name) {
      const history = await getHistoryList(undefined, { limit: 1 });
      if (!history.ok) {
        return history;
      }
      const latest = history.value[0];
      if (!latest) {
        return { ok: false, error: { type: "conflict" } };
      }
      const checkpoint = await client.getContent(latest.to);
      if (!checkpoint.ok) {
        return checkpoint;
      }
      const frozen = new Y.Doc();
      const stored = new Y.Doc();
      try {
        Y.applyUpdateV2(frozen, content);
        Y.applyUpdate(stored, checkpoint.value);
        if (
          JSON.stringify(findTypeInOtherYdoc(fragment, frozen).toJSON()) !==
          JSON.stringify(findTypeInOtherYdoc(fragment, stored).toJSON())
        ) {
          return { ok: false, error: { type: "conflict" } };
        }
      } finally {
        frozen.destroy();
        stored.destroy();
      }
      const existing = await client.getVersion(latest.to);
      if (!existing.ok) {
        return existing;
      }
      const result = existing.value
        ? await client.updateVersion(existing.value, name ?? "")
        : await client.createVersion(latest.to, name ?? "");
      if (!result.ok) {
        return result;
      }
      const version = result.value;
      return {
        ok: true,
        value: {
          id: `${latest.from}-${version.t}`,
          createdAt: version.t,
          name: version.name || undefined,
          metadata: version.custom,
          by: latest.by,
        },
      };
    },
    async restore(id) {
      const { to } = timestamps(id);
      const [before, document] = await Promise.all([
        getHistoryList(undefined, { limit: 1 }),
        client.getDocument({ gc: false }),
      ]);
      if (!before.ok) {
        return before;
      }
      if (!document.ok) {
        return document;
      }
      const ids = collectFragmentIds(fragment, document.value);
      if (before.value[0]) {
        const existing = await client.getVersion(before.value[0].to);
        if (!existing.ok) {
          return existing;
        }
        if (!existing.value) {
          const backup = await client.createVersion(
            before.value[0].to,
            beforeRestoreName,
          );
          if (!backup.ok) {
            return backup;
          }
        }
      }
      const rollback = await client.rollback({
        from: to + 1,
        contentIds: Y.encodeContentIds({ inserts: ids, deletes: ids }),
      });
      if (!rollback.ok) {
        return rollback;
      }
      // Fetch the authoritative post-rollback update rather than assuming the
      // websocket already delivered it. Apply to the live doc, never the fork.
      const restored = await client.getDocument({ gc: false });
      if (!restored.ok) {
        return restored.error.type === "timeout"
          ? { ok: false, error: { type: "timeout", outcome: "unknown" } }
          : restored;
      }
      Y.applyUpdate(fragment.doc!, restored.value);
      return { ok: true, value: undefined };
    },
    async rename(id, name) {
      const { to } = timestamps(id);
      const existing = await client.getVersion(to);
      if (!existing.ok) {
        return existing;
      }
      if (!existing.value && !name) {
        return { ok: true, value: undefined };
      }
      const result = existing.value
        ? await client.updateVersion(existing.value, name ?? "")
        : await client.createVersion(to, name ?? "");
      return result.ok ? { ok: true, value: undefined } : result;
    },
    async remove(id) {
      const existing = await client.getVersion(timestamps(id).to);
      if (!existing.ok) {
        return existing;
      }
      if (!existing.value) {
        return { ok: true, value: undefined };
      }
      if (
        existing.value.custom !== null &&
        existing.value.custom !== undefined
      ) {
        const result = await client.updateVersion(existing.value, "");
        return result.ok ? { ok: true, value: undefined } : result;
      } else {
        return client.deleteVersion(existing.value);
      }
    },
  };
}
