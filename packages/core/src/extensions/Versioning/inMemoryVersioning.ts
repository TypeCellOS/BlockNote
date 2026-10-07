import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { originalFactorySymbol } from "../../editor/managers/ExtensionManager/symbol.js";
import type {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { blockToNode } from "../../api/nodeConversions/blockToNode.js";
import { docToBlocks } from "../../api/nodeConversions/nodeToBlock.js";
import type { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import type {
  VersionSnapshot,
  VersionStorage,
  VersionViewAdapter,
} from "./types.js";
import { createVersioningExtension } from "./Versioning.js";
import type { UserStoreOrResolver } from "../../user/index.js";

/** ProseMirror JSON uses schema-defined node/mark names and attribute values. */
export type ProseMirrorNodeJSON = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNodeJSON[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};

export type ProseMirrorDocumentJSON = ProseMirrorNodeJSON & { type: "doc" };

export type LocalVersioningSeedOptions<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> = {
  initialVersions?: Array<{
    /** A partial-block array or ProseMirror document JSON, valid in this editor's schema. */
    content:
      | PartialBlock<BSchema, ISchema, SSchema>[]
      | ProseMirrorDocumentJSON;
    name?: string;
    createdAt: number;
  }>;
};

export type LocalVersioningOptions<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> = LocalVersioningSeedOptions<BSchema, ISchema, SSchema> & {
  resolveUsers?: UserStoreOrResolver;
  scrollToFirstChange?: boolean;
};

/** Install an independent in-memory history for this editor. */
export function InMemoryVersioningExtension<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
>(options?: LocalVersioningOptions<BSchema, ISchema, SSchema>) {
  return function createLocalVersioningExtension({
    editor,
  }: {
    editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
  }) {
    const extension = createVersioningExtension(() => ({
      ...createLocalVersioning(editor, options),
      resolveUsers: options?.resolveUsers,
      scrollToFirstChange: options?.scrollToFirstChange,
    }))()({ editor });
    // Register the public factory for editor.getExtension(factory).
    Object.assign(extension, {
      [originalFactorySymbol]: InMemoryVersioningExtension,
    });
    return extension;
  };
}

/** A separate editor state preserves live selection and undo without preview mappings. */
export function createLocalVersioning<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  options?: LocalVersioningSeedOptions<BSchema, ISchema, SSchema>,
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
    const content = entry.content;
    const document = Array.isArray(content)
      ? editor.pmSchema.topNodeType.createChecked(
          null,
          editor.pmSchema.nodes.blockGroup.createChecked(
            null,
            content.map((block) =>
              blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
            ),
          ),
        )
      : editor.pmSchema.nodeFromJSON(content);
    // Invalid seeds are configuration errors, not recoverable editor input.
    // nodeFromJSON does not check the whole content tree; container block
    // conversion is also intentionally lenient, so validate both paths here.
    if (document.type !== editor.pmSchema.topNodeType) {
      throw new Error("Version content must be a ProseMirror document");
    }
    document.check();
    snapshots.set(version.id, { version, content: document });
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
          show({ content, comparison }) {
            if (closed) {
              throw new Error("Version view is closed");
            }
            const diff =
              editor.getExtension<typeof DiffVersioningExtension>(
                "diffVersioning",
              );
            if (comparison && diff) {
              diff.renderDiff(
                docToBlocks(content),
                docToBlocks(comparison.content),
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
      historyIncludesBeginning: true,
      async list(signal) {
        signal.throwIfAborted();
        return {
          ok: true,
          value: [...snapshots.values()].map(({ version }) => ({ ...version })),
        };
      },
      async getContent(id, signal) {
        signal.throwIfAborted();
        const stored = snapshots.get(id);
        return stored
          ? { ok: true, value: stored.content }
          : { ok: false, error: { type: "not-found" } };
      },
      async create(content, name) {
        const version = { id: String(++nextId), createdAt: Date.now(), name };
        snapshots.set(version.id, { version, content });
        return { ok: true, value: { ...version } };
      },
      async restore(id) {
        const stored = snapshots.get(id);
        if (!stored) {
          return { ok: false, error: { type: "not-found" } };
        }
        const content = inEditorSchema(stored.content);
        if (live) {
          live = live.apply(
            live.tr.replaceWith(0, live.doc.content.size, content.content),
          );
        } else {
          editor.transact((tr) =>
            tr.replaceWith(0, tr.doc.content.size, content.content),
          );
        }
        return { ok: true, value: undefined };
      },
      async rename(id, name) {
        const stored = snapshots.get(id);
        if (!stored) {
          return { ok: false, error: { type: "not-found" } };
        }
        stored.version.name = name;
        return { ok: true, value: undefined };
      },
      async remove(id) {
        snapshots.delete(id);
        return { ok: true, value: undefined };
      },
    },
  };
}
