import { describe, expect } from "vite-plus/test";
import { TextSelection } from "prosemirror-state";
import * as Y from "yjs";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { CommentsExtension } from "../../comments/extension.js";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
import { YjsThreadStore } from "../comments/YjsThreadStore.js";
import { withCollaboration } from "../index.js";

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
// editor so callers can
// apply extra marks before destroying it. Marks therefore land in Yjs exactly
// the way y-prosemirror writes them.
async function createLegacyEditor(
  setupEditor: SetupEditor,
  fragment: Y.XmlFragment,
  opts: { threadStore?: YjsThreadStore } = {},
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#0000ff", name: "Legacy User" },
        provider: undefined,
      },
      schema: legacySchema,
      // Register the Yjs attribution marks — they're the annotation mark
      // reachable from core (the AI suggestion marks live in xl-ai), so they
      // stand in for the `"annotation"` group here and let the plain code block
      // keep them while dropping formatting.
      extensions: [
        YAttributionMarksExtension(),
        ...(opts.threadStore
          ? [
              CommentsExtension({
                threadStore: opts.threadStore,
                resolveUsers: async () => [],
              }),
            ]
          : []),
      ],
    }),
  });
  editor.replaceBlocks(editor.document, [
    {
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ type: "text", text: "const x = 1;", styles: { bold: true } }],
    },
  ]);
  return editor;
}

// Populates `fragment` with a bold-formatted code block (optionally also a
// suggestion / `y-attributed-insert` mark).
async function buildLegacyFormattedCodeBlock(
  setupEditor: SetupEditor,
  fragment: Y.XmlFragment,
  opts: { withSuggestion?: boolean } = {},
) {
  const editor = await createLegacyEditor(setupEditor, fragment);
  if (opts.withSuggestion) {
    editor.transact((tr) =>
      tr.addMark(
        0,
        tr.doc.content.size,
        editor.pmSchema.marks["y-attributed-insert"].create({
          userIds: ["test-user"],
        }),
      ),
    );
  }
  editor.unmount();
}

// Populates `ydoc` with a code block carrying a bold mark AND a real comment
// (created through the comment API, so the comment mark is encoded by
// y-prosemirror as `comment--<hash>`).
async function buildLegacyCommentedCodeBlock(
  setupEditor: SetupEditor,
  ydoc: Y.Doc,
) {
  const editor = await createLegacyEditor(
    setupEditor,
    ydoc.getXmlFragment("doc"),
    {
      threadStore: createThreadStore(ydoc),
    },
  );
  // The public block-selection API requires two distinct blocks; this
  // fixture annotates the text of the only block.
  editor.transact((tr) =>
    tr.setSelection(
      TextSelection.between(
        tr.doc.resolve(1),
        tr.doc.resolve(tr.doc.content.size - 1),
      ),
    ),
  );
  await editor.getExtension(CommentsExtension)!.createThread({
    initialComment: { body: "review this" },
  });
  editor.unmount();
}

async function createCollabEditor(
  setupEditor: SetupEditor,
  fragment: Y.XmlFragment,
  opts: { threadStore?: YjsThreadStore } = {},
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#ff0000", name: "Test User" },
        provider: undefined,
      },
      // Register the same annotation mark on the reconstructing editor, so it's
      // allowed on the plain block and materialized rather than dropped.
      extensions: [
        YAttributionMarksExtension(),
        ...(opts.threadStore
          ? [
              CommentsExtension({
                threadStore: opts.threadStore,
                resolveUsers: async () => [],
              }),
            ]
          : []),
      ],
    }),
  });
  return editor;
}

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
  it("preserves a formatted code block present before mount, dropping only the formatting", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");
    await buildLegacyFormattedCodeBlock(setupEditor, fragment);

    // The fixture really does carry a bold mark, encoded by y-prosemirror.
    expect(markKeysIn(fragment).has("bold")).toBe(true);

    const editor = await createCollabEditor(setupEditor, fragment);

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
  });

  it("preserves a formatted code block that syncs in after mount", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const remoteDoc = new Y.Doc();
    onTestFinished(() => remoteDoc.destroy());
    await buildLegacyFormattedCodeBlock(
      setupEditor,
      remoteDoc.getXmlFragment("doc"),
    );

    const localDoc = new Y.Doc();
    onTestFinished(() => localDoc.destroy());
    const localFragment = localDoc.getXmlFragment("doc");

    // Editor mounts on an empty fragment, before any content arrives.
    const editor = await createCollabEditor(setupEditor, localFragment);
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
  });

  it("keeps the reconstructed block editable (leftover marks don't break positions)", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");
    await buildLegacyFormattedCodeBlock(setupEditor, fragment);

    const editor = await createCollabEditor(setupEditor, fragment);
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
  });

  it("keeps suggestion (y-attributed-insert) marks while dropping formatting", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");
    await buildLegacyFormattedCodeBlock(setupEditor, fragment, {
      withSuggestion: true,
    });

    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    // y-prosemirror encodes a mark that carries attributes with a hash suffix
    // (e.g. `y-attributed-insert--<hash>`).
    expect([...before].some((k) => k.startsWith("y-attributed-insert"))).toBe(
      true,
    );

    const editor = await createCollabEditor(setupEditor, fragment);

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
    expect([...after].some((k) => k.startsWith("y-attributed-insert"))).toBe(
      true,
    );
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(false);
  });

  it("keeps a real comment mark (encoded as comment--<hash>) while dropping formatting", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ydoc = new Y.Doc();
    onTestFinished(() => ydoc.destroy());
    await buildLegacyCommentedCodeBlock(setupEditor, ydoc);
    const fragment = ydoc.getXmlFragment("doc");

    // The comment mark is stored under a hashed key, not just "comment".
    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    expect([...before].some((k) => k.startsWith("comment--"))).toBe(true);

    // Mount a comments-configured collab editor on the same doc, so the comment
    // mark exists in the schema and is allowed on the (plain) code block.
    const editor = await createCollabEditor(setupEditor, fragment, {
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
  });

  it("leaves an already-clean code block untouched (no-op for valid content)", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");
    // A plain code block produced by the current schema (no disallowed marks).
    const seedEditor = await createCollabEditor(setupEditor, fragment);
    seedEditor.replaceBlocks(seedEditor.document, [
      { type: "codeBlock", content: "const x = 1;" },
    ]);
    const before = fragment.toJSON();
    seedEditor.unmount();

    // Reconstruct it in a fresh collab editor: the override is a no-op, so the
    // fragment is byte-for-byte unchanged.
    const editor = await createCollabEditor(setupEditor, fragment);
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);
    expect(fragment.toJSON()).toBe(before);
  });

  it("does not touch inline blocks: a bold paragraph keeps its formatting", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");

    // A paragraph is "inline" content, so bold is allowed and should survive
    // reconstruction untouched — the override is scoped to plain blocks.
    const seedEditor = await createCollabEditor(setupEditor, fragment);
    seedEditor.replaceBlocks(seedEditor.document, [
      {
        type: "paragraph",
        content: [{ type: "text", text: "hello", styles: { bold: true } }],
      },
    ]);
    const before = fragment.toJSON();
    seedEditor.unmount();

    const editor = await createCollabEditor(setupEditor, fragment);
    expect(editor.document.map((b) => b.type)).toEqual(["paragraph"]);
    // Bold is materialized (kept) on the inline block.
    expect(styleKeysOf(editor.document[0]).has("bold")).toBe(true);
    // And the fragment is unchanged (override was a no-op for this node).
    expect(fragment.toJSON()).toBe(before);
  });
});
