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
  function timestamp(id: string) {
    const value = Number(id);
    if (!Number.isFinite(value)) {
      throw new Error("Invalid YHub checkpoint identifier");
    }
    return value;
  }
  function activity(signal?: AbortSignal, overrides?: YHubQueryParams) {
    return client.getActivity(
      {
        order: "desc",
        limit: 50,
        groupMaxGap: 60 * 60 * 1000,
        groupMaxDuration: 12 * 60 * 60 * 1000,
        groupByUser: false,
        customAttributions: true,
        ...options.activityParams,
        ...overrides,
        versions: true,
      },
      signal,
    );
  }
  return {
    async list(signal) {
      const result = await activity(signal);
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        value: result.value.map((entry): VersionSnapshot => {
          const custom = entry.version?.custom;
          const restoredFrom =
            custom !== null &&
            typeof custom === "object" &&
            "restoredFrom" in custom
              ? custom.restoredFrom
              : undefined;
          return {
            id: String(entry.to),
            createdAt: entry.to,
            by: entry.by,
            name: entry.version?.name || undefined,
            metadata: custom,
            customAttributions: entry.customAttributions,
            restoredFrom:
              typeof restoredFrom === "number" && Number.isFinite(restoredFrom)
                ? { id: String(restoredFrom), createdAt: restoredFrom }
                : undefined,
          };
        }),
      };
    },
    async getContent(id, signal) {
      const result = await client.getContent(timestamp(id), signal);
      return result.ok
        ? { ok: true, value: Y.convertUpdateFormatV1ToV2(result.value) }
        : result;
    },
    async getAttributions(target, baselineId, _capturedAt, signal) {
      const result = await client.getAttributions(
        timestamp(baselineId),
        // Use the server's current time, not the potentially skewed client clock.
        target.type === "current" ? undefined : timestamp(target.id),
        signal,
      );
      return result.ok
        ? { ok: true, value: Y.decodeContentMap(result.value) }
        : result;
    },
    async create(content, name) {
      const history = await activity(undefined, { limit: 1 });
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
          id: String(version.t),
          createdAt: version.t,
          name: version.name || undefined,
          metadata: version.custom,
          by: latest.by,
        },
      };
    },
    async restore(id) {
      const to = timestamp(id);
      const [before, document] = await Promise.all([
        activity(undefined, { limit: 1 }),
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
      const to = timestamp(id);
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
      const existing = await client.getVersion(timestamp(id));
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
