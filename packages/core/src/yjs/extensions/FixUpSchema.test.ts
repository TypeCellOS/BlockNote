import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { CommentsExtension } from "../../comments/extension.js";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { YjsThreadStore } from "../comments/YjsThreadStore.js";
import { withCollaboration } from "../index.js";

/**
 * @vitest-environment jsdom
 */

// These tests cover the mark-dropping part of `FixUpSchemaExtension`, which lets
// a document survive a block whose content type changed from `"inline"` (marks allowed)
// to `"plain"` (only the `"annotation"` group allowed). The key behaviour: the
// disallowed marks REMAIN in the Yjs fragment (we never mutate the Yjs doc), but
// they are NOT materialized into ProseMirror — so the block is not deleted and
// its text is preserved. Everything is exercised end-to-end through a real
// collaborative editor, i.e. through y-prosemirror's actual reconstruction path
// (`schema.node` -> `createChecked`) that would otherwise delete the block.

// A "legacy" schema where the code block holds inline content — i.e. the schema
// from BEFORE the migration to "plain", where a code block could carry
// formatting marks. Used to produce fixtures via a real editor so that marks
// are encoded in Yjs exactly as y-prosemirror encodes them (rather than by
// hand, which could assume the wrong attribute names).
const legacySchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createBlockSpec(
      createBlockConfig(() => ({
        type: "codeBlock" as const,
        propSchema: { language: { default: "" } },
        content: "inline" as const,
      })),
      {
        render: () => {
          const dom = document.createElement("pre");
          const code = document.createElement("code");
          dom.append(code);
          return { dom, contentDOM: code };
        },
      },
    )(),
  },
});

const createThreadStore = (ydoc: Y.Doc) =>
  new YjsThreadStore(
    "test-user",
    ydoc.getMap("threads"),
    new DefaultThreadStoreAuth("test-user", "editor"),
  );

// Mounts a real collaborative editor on the legacy schema (code block = inline,
// so it allows marks), seeded with a bold-formatted code block. Returns the
// editor (typed loosely, since it doesn't use the default schema) so callers can
// apply extra marks before destroying it. Marks therefore land in Yjs exactly
// the way y-prosemirror writes them.
const createLegacyEditor = (
  fragment: Y.XmlFragment,
  opts: { threadStore?: YjsThreadStore } = {},
) => {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#0000ff", name: "Legacy User" },
        provider: undefined,
      },
      schema: legacySchema,
      ...(opts.threadStore && {
        extensions: [
          CommentsExtension({
            threadStore: opts.threadStore,
            resolveUsers: async () => [],
          }),
        ],
      }),
    }) as Parameters<typeof BlockNoteEditor.create>[0],
  ) as unknown as BlockNoteEditor<any, any, any>;
  editor.mount(document.createElement("div"));
  editor.replaceBlocks(editor.document, [
    {
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ type: "text", text: "const x = 1;", styles: { bold: true } }],
    },
  ]);
  return editor;
};

// Populates `fragment` with a bold-formatted code block (optionally also a
// suggestion/`insertion` mark).
const buildLegacyFormattedCodeBlock = (
  fragment: Y.XmlFragment,
  opts: { withSuggestion?: boolean } = {},
) => {
  const editor = createLegacyEditor(fragment);
  if (opts.withSuggestion) {
    editor.transact((tr) =>
      tr.addMark(
        0,
        tr.doc.content.size,
        editor.pmSchema.marks.insertion.create({ id: 1 }),
      ),
    );
  }
  editor._tiptapEditor.destroy();
};

// Populates `ydoc` with a code block carrying a bold mark AND a real comment
// (created through the comment API, so the comment mark is encoded by
// y-prosemirror as `comment--<hash>`).
const buildLegacyCommentedCodeBlock = async (ydoc: Y.Doc) => {
  const editor = createLegacyEditor(ydoc.getXmlFragment("doc"), {
    threadStore: createThreadStore(ydoc),
  });
  (editor as any)._tiptapEditor.commands.selectAll();
  await (editor.getExtension(CommentsExtension) as any).createThread({
    initialComment: { body: "review this" },
  });
  editor._tiptapEditor.destroy();
};

const createCollabEditor = (
  fragment: Y.XmlFragment,
  opts: { threadStore?: YjsThreadStore } = {},
) => {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#ff0000", name: "Test User" },
        provider: undefined,
      },
      ...(opts.threadStore && {
        extensions: [
          CommentsExtension({
            threadStore: opts.threadStore,
            resolveUsers: async () => [],
          }),
        ],
      }),
    }),
  );
  editor.mount(document.createElement("div"));
  return editor;
};

// Collects every mark-attribute key present on a fragment's text.
const markKeysIn = (fragment: Y.XmlFragment) => {
  const keys = new Set<string>();
  const walk = (node: Y.AbstractType<any>) => {
    if (node instanceof Y.XmlText) {
      for (const op of node.toDelta() as { attributes?: object }[]) {
        if (op.attributes) {
          Object.keys(op.attributes).forEach((k) => keys.add(k));
        }
      }
    } else if (node instanceof Y.XmlElement || node instanceof Y.XmlFragment) {
      node.toArray().forEach(walk);
    }
  };
  fragment.toArray().forEach(walk);
  return keys;
};

// Collects the style keys present on a block's inline content (empty for plain
// text). A materialized formatting mark would show up here.
const styleKeysOf = (block: any) => {
  const keys = new Set<string>();
  if (Array.isArray(block.content)) {
    for (const inline of block.content) {
      if (inline.styles) {
        Object.keys(inline.styles).forEach((k) => keys.add(k));
      }
    }
  }
  return keys;
};

describe("FixUpSchema: formatted code block backwards compatibility", () => {
  it("preserves a formatted code block present before mount, dropping only the formatting", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment);

    // The fixture really does carry a bold mark, encoded by y-prosemirror.
    expect(markKeysIn(fragment).has("bold")).toBe(true);

    const editor = createCollabEditor(fragment);

    // The block survives reconstruction with its text intact...
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);
    // ...bold is NOT materialized into ProseMirror...
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);
    // ...but the mark is STILL in the Yjs fragment (we never mutate the Yjs doc).
    expect(markKeysIn(fragment).has("bold")).toBe(true);

    editor._tiptapEditor.destroy();
  });

  it("preserves a formatted code block that syncs in after mount", () => {
    const remoteDoc = new Y.Doc();
    buildLegacyFormattedCodeBlock(remoteDoc.getXmlFragment("doc"));

    const localDoc = new Y.Doc();
    const localFragment = localDoc.getXmlFragment("doc");

    // Editor mounts on an empty fragment, before any content arrives.
    const editor = createCollabEditor(localFragment);
    expect(localFragment.toJSON()).toBe("");

    // Provider delivers the initial state after mount.
    Y.applyUpdate(localDoc, Y.encodeStateAsUpdate(remoteDoc));

    // The code block survives in the editor...
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);
    // ...and in the Yjs fragment — i.e. it was NOT deleted (which would
    // otherwise propagate the deletion back to every peer)...
    expect(localFragment.toJSON()).toContain("const x = 1;");
    // ...with its formatting not materialized into ProseMirror...
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);
    // ...but the bold mark still present in the fragment (left in Yjs).
    expect(markKeysIn(localFragment).has("bold")).toBe(true);

    editor._tiptapEditor.destroy();
  });

  it("keeps the reconstructed block editable (leftover marks don't break positions)", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment);

    const editor = createCollabEditor(fragment);
    const block = editor.document[0];
    expect(block.content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);

    // Editing the reconstructed block applies cleanly despite the leftover bold
    // mark still living in the Yjs fragment.
    editor.updateBlock(block, { content: "const x = 2;" });

    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 2;",
        type: "text",
      },
    ]);
    // Still no materialized formatting after the edit.
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });

  it("keeps suggestion (insertion) marks while dropping formatting", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment, { withSuggestion: true });

    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    expect(before.has("insertion")).toBe(true);

    const editor = createCollabEditor(fragment);

    // Block survives with text intact.
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);

    const after = markKeysIn(fragment);
    // Formatting left in Yjs but not materialized; suggestion (allowed) kept.
    expect(after.has("bold")).toBe(true);
    expect(after.has("insertion")).toBe(true);
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });

  it("keeps a real comment mark (encoded as comment--<hash>) while dropping formatting", async () => {
    const ydoc = new Y.Doc();
    await buildLegacyCommentedCodeBlock(ydoc);
    const fragment = ydoc.getXmlFragment("doc");

    // The comment mark is stored under a hashed key, not just "comment".
    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    expect([...before].some((k) => k.startsWith("comment--"))).toBe(true);

    // Mount a comments-configured collab editor on the same doc, so the comment
    // mark exists in the schema and is allowed on the (plain) code block.
    const editor = createCollabEditor(fragment, {
      threadStore: createThreadStore(ydoc),
    });

    // Block survives with text intact.
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);

    const after = markKeysIn(fragment);
    // The hashed comment mark is kept (allowed); bold left in Yjs but not
    // materialized as formatting.
    expect([...after].some((k) => k.startsWith("comment--"))).toBe(true);
    expect(after.has("bold")).toBe(true);
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });

  it("leaves an already-clean code block untouched (no-op for valid content)", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    // A plain code block produced by the current schema (no disallowed marks).
    const seedEditor = createCollabEditor(fragment);
    seedEditor.replaceBlocks(seedEditor.document, [
      { type: "codeBlock", content: "const x = 1;" },
    ]);
    const before = fragment.toJSON();
    seedEditor._tiptapEditor.destroy();

    // Reconstruct it in a fresh collab editor: the override is a no-op, so the
    // fragment is byte-for-byte unchanged.
    const editor = createCollabEditor(fragment);
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);
    expect(fragment.toJSON()).toBe(before);

    editor._tiptapEditor.destroy();
  });

  it("does not touch inline blocks: a bold paragraph keeps its formatting", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");

    // A paragraph is "inline" content, so bold is allowed and should survive
    // reconstruction untouched — the override is scoped to plain blocks.
    const seedEditor = createCollabEditor(fragment);
    seedEditor.replaceBlocks(seedEditor.document, [
      {
        type: "paragraph",
        content: [{ type: "text", text: "hello", styles: { bold: true } }],
      },
    ]);
    const before = fragment.toJSON();
    seedEditor._tiptapEditor.destroy();

    const editor = createCollabEditor(fragment);
    expect(editor.document.map((b) => b.type)).toEqual(["paragraph"]);
    // Bold is materialized (kept) on the inline block.
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(true);
    // And the fragment is unchanged (override was a no-op for this node).
    expect(fragment.toJSON()).toBe(before);

    editor._tiptapEditor.destroy();
  });
});
