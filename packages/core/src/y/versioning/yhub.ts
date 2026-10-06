import * as Y from "@y/y";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type {
  VersionSnapshot,
  VersionStorage,
} from "../../extensions/Versioning/types.js";
import { collectFragmentIds } from "../utils.js";
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

export interface YVersionStorageBinding {
  bind(context: {
    editor: BlockNoteEditor;
    fragment: Y.Node;
  }): VersionStorage<Uint8Array, Y.ContentMap>;
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
  storage: VersionStorage<Uint8Array, Y.ContentMap> | YVersionStorageBinding;
  scrollToFirstChange?: boolean;
}) {
  return createVersioningExtension((editor) => {
    const collaboration = editor.getExtension(CollaborationExtension);
    if (!collaboration) {
      throw new Error("Y14 versioning requires Y14 collaboration");
    }
    return {
      adapter: createYVersionView(editor, collaboration.fragment),
      storage:
        "bind" in options.storage
          ? options.storage.bind({ editor, fragment: collaboration.fragment })
          : options.storage,
      resolveUsers: collaboration.userStore,
      scrollToFirstChange: options.scrollToFirstChange,
    };
  })();
}

/** Continuous history stores server checkpoints, including the newest recorded edit. */
export function createYHubVersionStorage(
  options: YHubVersionStorageOptions,
): YVersionStorageBinding {
  return {
    bind({ editor, fragment }) {
      return bindYHubVersionStorage(editor, fragment, options);
    },
  };
}

function bindYHubVersionStorage(
  editor: BlockNoteEditor,
  fragment: Y.Node,
  options: YHubVersionStorageOptions,
): YHubStorage {
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
      return (await activity(signal)).map((entry): VersionSnapshot => {
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
      });
    },
    async getContent(id, signal) {
      return Y.convertUpdateFormatV1ToV2(
        await client.getContent(timestamp(id), signal),
      );
    },
    async getAttributions(target, baselineId, capturedAt, signal) {
      return Y.decodeContentMap(
        await client.getAttributions(
          timestamp(baselineId),
          target.type === "current" ? capturedAt : timestamp(target.id),
          signal,
        ),
      );
    },
    async create(_content, name) {
      const latest = (await activity(undefined, { limit: 1 }))[0];
      if (!latest) {
        return undefined;
      }
      const existing = await client.getVersion(latest.to);
      const version = existing
        ? await client.updateVersion(existing, name ?? "")
        : await client.createVersion(latest.to, name ?? "");
      return {
        id: String(version.t),
        createdAt: version.t,
        name: version.name || undefined,
        metadata: version.custom,
        by: latest.by,
      };
    },
    async restore(id) {
      const to = timestamp(id);
      const [before, document] = await Promise.all([
        activity(undefined, { limit: 1 }),
        client.getDocument({ gc: false }),
      ]);
      const ids = collectFragmentIds(fragment, document);
      if (before[0] && !(await client.getVersion(before[0].to))) {
        await client.createVersion(
          before[0].to,
          editor.dictionary.versioning.before_restore,
        );
      }
      await client.rollback({
        from: to + 1,
        contentIds: Y.encodeContentIds({ inserts: ids, deletes: ids }),
      });
    },
    async rename(id, name) {
      const to = timestamp(id);
      const existing = await client.getVersion(to);
      if (existing) {
        await client.updateVersion(existing, name ?? "");
      } else if (name) {
        await client.createVersion(to, name);
      }
    },
    async remove(id) {
      const existing = await client.getVersion(timestamp(id));
      if (!existing) {
        return;
      }
      if (existing.custom !== null && existing.custom !== undefined) {
        await client.updateVersion(existing, "");
      } else {
        await client.deleteVersion(existing);
      }
    },
  };
}
