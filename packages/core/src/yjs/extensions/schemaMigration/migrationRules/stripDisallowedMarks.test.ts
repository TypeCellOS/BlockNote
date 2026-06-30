import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { BlockNoteSchema } from "../../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../../blocks/defaultBlocks.js";
import { CommentsExtension } from "../../../../comments/extension.js";
import { DefaultThreadStoreAuth } from "../../../../comments/threadstore/DefaultThreadStoreAuth.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../../../schema/index.js";
import { YjsThreadStore } from "../../../comments/YjsThreadStore.js";
import { withCollaboration } from "../../index.js";
import { stripDisallowedMarks } from "./stripDisallowedMarks.js";

/**
 * @vitest-environment jsdom
 */

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

// An editor (schema) WITH comments configured, so the comment mark exists and is
// allowed on the code block.
const commentsSchemaEditor = () =>
  BlockNoteEditor.create({
    extensions: [
      CommentsExtension({
        threadStore: createThreadStore(new Y.Doc()),
        resolveUsers: async () => [],
      }),
    ],
  });

const createCollabEditor = (fragment: Y.XmlFragment) => {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#ff0000", name: "Test User" },
        provider: undefined,
      },
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

describe("stripDisallowedMarks rule", () => {
  it("removes formatting from a plain block's text while keeping the text", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment);

    // The fixture really does carry a bold mark, encoded by y-prosemirror.
    expect(markKeysIn(fragment).has("bold")).toBe(true);

    stripDisallowedMarks(fragment, BlockNoteEditor.create().pmSchema);

    expect(markKeysIn(fragment).has("bold")).toBe(false);
    expect(fragment.toJSON()).toContain("const x = 1;");
  });

  it("keeps suggestion marks while stripping formatting", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment, { withSuggestion: true });

    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    expect(before.has("insertion")).toBe(true);

    stripDisallowedMarks(fragment, BlockNoteEditor.create().pmSchema);

    const after = markKeysIn(fragment);
    expect(after.has("bold")).toBe(false); // formatting stripped
    expect(after.has("insertion")).toBe(true); // suggestion (allowed) kept
    expect(fragment.toJSON()).toContain("const x = 1;");
  });

  it("keeps a real comment mark (encoded as comment--<hash>) while stripping formatting", async () => {
    const ydoc = new Y.Doc();
    await buildLegacyCommentedCodeBlock(ydoc);
    const fragment = ydoc.getXmlFragment("doc");

    // The comment mark is stored under a hashed key, not just "comment".
    const before = markKeysIn(fragment);
    expect(before.has("bold")).toBe(true);
    expect([...before].some((k) => k.startsWith("comment--"))).toBe(true);

    // Run the migration with a comments-configured schema, so the comment mark
    // exists in the schema and is allowed on the code block.
    stripDisallowedMarks(fragment, commentsSchemaEditor().pmSchema);

    const after = markKeysIn(fragment);
    expect(after.has("bold")).toBe(false); // formatting stripped
    // The hashed comment mark is resolved to "comment" and kept.
    expect([...after].some((k) => k.startsWith("comment--"))).toBe(true);
    expect(fragment.toJSON()).toContain("const x = 1;");
  });

  it("leaves an already-clean code block untouched", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    // A plain code block produced by the current schema (no disallowed marks).
    const editor = createCollabEditor(fragment);
    editor.replaceBlocks(editor.document, [
      { type: "codeBlock", content: "const x = 1;" },
    ]);
    editor._tiptapEditor.destroy();

    const before = fragment.toJSON();
    stripDisallowedMarks(fragment, BlockNoteEditor.create().pmSchema);

    expect(fragment.toJSON()).toBe(before);
  });
});

describe("SchemaMigration: formatted code block backwards compatibility", () => {
  it("preserves a formatted code block present before mount", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildLegacyFormattedCodeBlock(fragment);

    const editor = createCollabEditor(fragment);

    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toBe("const x = 1;");

    editor._tiptapEditor.destroy();
  });

  it("stops observing the fragment once migration is done", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");

    // Mounts on an empty fragment: the pre-sync observer is registered and
    // migration has not yet run (no content).
    const editor = createCollabEditor(fragment);

    const deepObserverCount = () =>
      (fragment as unknown as { _dEH?: { l?: unknown[] } })._dEH?.l?.length ??
      0;
    const beforeSync = deepObserverCount();

    // First content-bearing sync completes migration, which removes the
    // observer.
    const remoteDoc = new Y.Doc();
    buildLegacyFormattedCodeBlock(remoteDoc.getXmlFragment("doc"));
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc));

    expect(deepObserverCount()).toBe(beforeSync - 1);
    expect(editor.document[0].content).toBe("const x = 1;");

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
    expect(editor.document[0].content).toBe("const x = 1;");
    // ...and in the Yjs fragment — i.e. it was NOT deleted (which would
    // otherwise propagate the deletion back to every peer)...
    expect(localFragment.toJSON()).toContain("const x = 1;");
    // ...with its formatting dropped.
    expect(markKeysIn(localFragment).has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });
});
