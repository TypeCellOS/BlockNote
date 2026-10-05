import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { docToBlocks } from "../../api/nodeConversions/nodeToBlock.js";
import type { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import type {
  VersionSnapshot,
  VersionStorage,
  VersionViewAdapter,
} from "./types.js";
import { createVersioningExtension } from "./Versioning.js";
import type { UserStoreOrResolver } from "../../user/index.js";

export type LocalVersioningSeedOptions = {
  initialVersions?: Array<{
    content: Node;
    name?: string;
    createdAt: number;
  }>;
};

export type LocalVersioningOptions = LocalVersioningSeedOptions & {
  resolveUsers?: UserStoreOrResolver;
  scrollToFirstChange?: boolean;
};

/** Install an independent in-memory history for this editor. */
export const VersioningExtension = createExtension(
  ({ editor, options }: ExtensionOptions<LocalVersioningOptions | undefined>) =>
    createVersioningExtension(() => ({
      ...createLocalVersioning(editor, options),
      resolveUsers: options?.resolveUsers,
      scrollToFirstChange: options?.scrollToFirstChange,
    }))()({ editor }),
);

/** A separate editor state preserves live selection and undo without preview mappings. */
export function createLocalVersioning(
  editor: BlockNoteEditor,
  options?: LocalVersioningSeedOptions,
): {
  adapter: VersionViewAdapter<Node>;
  storage: VersionStorage<Node>;
} {
  let live: EditorState | undefined;
  let nextId = 0;
  const snapshots = new Map<
    string,
    { version: VersionSnapshot; content: Node }
  >();
  for (const entry of options?.initialVersions ?? []) {
    const version = {
      id: String(++nextId),
      name: entry.name,
      createdAt: entry.createdAt,
    };
    snapshots.set(version.id, { version, content: entry.content });
  }

  function snapshot(id: string) {
    const value = snapshots.get(id);
    if (!value) {
      throw new Error(`Unknown version: ${id}`);
    }
    return value;
  }

  function inEditorSchema(content: Node): Node {
    // ProseMirror matches node types by identity, not name. Seeded or loaded
    // documents can come from another editor with a different schema instance.
    return content.type.schema === editor.pmSchema
      ? content
      : editor.pmSchema.nodeFromJSON(content.toJSON());
  }

  return {
    adapter: {
      get supportsComparison() {
        return (
          editor.getExtension<typeof DiffVersioningExtension>(
            "diffVersioning",
          ) !== undefined
        );
      },
      open() {
        if (live || editor.getExtension("ySync")) {
          throw new Error(
            "Local version views require an unbound local editor",
          );
        }
        live = editor.prosemirrorState;
        const current = { content: live.doc, capturedAt: Date.now() };
        let closed = false;
        try {
          editor.prosemirrorView.updateState(
            EditorState.create({
              doc: live.doc,
              selection: live.selection,
              plugins: live.plugins,
            }),
          );
        } catch (error) {
          editor.prosemirrorView.updateState(live);
          live = undefined;
          throw error;
        }
        return {
          current,
          show({ content, comparison, target }) {
            if (closed) {
              throw new Error("Version view is closed");
            }
            const diff =
              editor.getExtension<typeof DiffVersioningExtension>(
                "diffVersioning",
              );
            if (comparison && diff) {
              let label = editor.dictionary.versioning.current_version;
              if (target.type === "snapshot") {
                const version = snapshots.get(target.id)?.version;
                const date = version && new Date(version.createdAt);
                label =
                  version?.name ??
                  (date
                    ? `${date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    : editor.dictionary.versioning.this_version);
              }
              diff.renderDiff(
                docToBlocks(content),
                docToBlocks(comparison.content),
                label,
              );
              return;
            }
            const document = inEditorSchema(content);
            editor.transact((tr) => {
              tr.replaceWith(0, tr.doc.content.size, document.content);
              tr.setMeta("addToHistory", false);
            });
          },
          close() {
            if (closed) {
              return;
            }
            if (!live) {
              throw new Error("Missing live editor state");
            }
            editor.prosemirrorView.updateState(
              live.reconfigure({
                plugins: editor.prosemirrorState.plugins,
              }),
            );
            closed = true;
            live = undefined;
          },
        };
      },
    },
    storage: {
      async list(signal) {
        signal.throwIfAborted();
        return [...snapshots.values()].map(({ version }) => ({ ...version }));
      },
      async getContent(id, signal) {
        signal.throwIfAborted();
        return snapshot(id).content;
      },
      async create(content, name) {
        const version = { id: String(++nextId), createdAt: Date.now(), name };
        snapshots.set(version.id, { version, content });
        return { ...version };
      },
      async restore(id) {
        const content = inEditorSchema(snapshot(id).content);
        if (live) {
          live = live.apply(
            live.tr.replaceWith(0, live.doc.content.size, content.content),
          );
        } else {
          editor.transact((tr) =>
            tr.replaceWith(0, tr.doc.content.size, content.content),
          );
        }
      },
      async rename(id, name) {
        snapshot(id).version.name = name;
      },
      async remove(id) {
        snapshots.delete(id);
      },
    },
  };
}
