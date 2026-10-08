/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";
import { TextSelection } from "prosemirror-state";
import * as Y1 from "yjs";

import { CommentsExtension } from "../../comments/extension.js";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YjsThreadStore as NewThreadStore } from "../comments/YjsThreadStore.js";
import { YjsThreadStore as LegacyThreadStore } from "../../yjs/comments/YjsThreadStore.js";
import { withCollaboration as withLegacyCollaboration } from "../../yjs/extensions/index.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

const editors: BlockNoteEditor[] = [];
const docs: Array<Y.Doc | Y1.Doc> = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
  for (const doc of docs.splice(0)) {
    doc.destroy();
  }
});

function createLegacyEditor(withComments = false) {
  const doc = new Y1.Doc();
  docs.push(doc);
  const threadStore = new LegacyThreadStore(
    "author",
    doc.getMap("threads"),
    new DefaultThreadStoreAuth("author", "editor"),
  );
  const editor = BlockNoteEditor.create(
    withLegacyCollaboration({
      collaboration: {
        fragment: doc.getXmlFragment("doc"),
        user: { name: "Author", color: "#ff0000" },
      },
      extensions: withComments
        ? [
            CommentsExtension({
              threadStore,
              resolveUsers: async () => [],
            }),
          ]
        : [],
    }),
  );
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return { doc, editor, threadStore };
}

function openWithNewBinding(
  update: Uint8Array,
  withComments = false,
  // Version history keeps deleted content (YHub stores documents without GC).
  gc = true,
) {
  const doc = new Y.Doc({ gc });
  docs.push(doc);
  Y.applyUpdateV2(doc, update);
  const stateBeforeMount = Y.encodeStateVector(doc);
  const threadStore = new NewThreadStore(
    "author",
    doc.get("threads"),
    new DefaultThreadStoreAuth("author", "editor"),
  );
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Reader", color: "#0000ff" },
      },
      extensions: withComments
        ? [
            CommentsExtension({
              threadStore,
              resolveUsers: async () => [],
            }),
          ]
        : [],
    }),
  );
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return { doc, editor, threadStore, stateBeforeMount };
}

/** Attribute every change between two document states to "author", as YHub would. */
function attributionsFor(before: Uint8Array, after: Uint8Array) {
  const doc = new Y.Doc({ gc: false });
  docs.push(doc);
  Y.applyUpdateV2(doc, before);
  const attributions = Y.createContentMap();
  doc.on("beforeObserverCalls", (tr) => {
    Y.insertIntoIdMap(
      attributions.inserts,
      Y.createIdMapFromIdSet(tr.insertSet, [
        Y.createContentAttribute("insert", "author"),
      ]),
    );
    Y.insertIntoIdMap(
      attributions.deletes,
      Y.createIdMapFromIdSet(tr.deleteSet, [
        Y.createContentAttribute("delete", "author"),
      ]),
    );
  });
  Y.applyUpdateV2(doc, after);
  return attributions;
}

/** Compare `before` → `after` in the editor's version view; returns the changed blocks. */
function diffBlocks(
  editor: BlockNoteEditor,
  doc: Y.Doc,
  before: Uint8Array,
  after: Uint8Array,
) {
  const view = createYVersionView(editor, doc.get("doc")).open();
  try {
    view.show({
      content: after,
      comparison: {
        content: before,
        attributions: attributionsFor(before, after),
      },
      target: { type: "snapshot", id: "after" },
    });
    const changed: Array<{
      change: string;
      type: string;
      text: string;
      users: string[];
    }> = [];
    editor.prosemirrorState.doc.descendants((node) => {
      const mark = node.marks.find(
        (mark) =>
          mark.type.name === "y-attributed-insert" ||
          mark.type.name === "y-attributed-delete",
      );
      if (node.type.name === "blockContainer" && mark) {
        changed.push({
          change: mark.type.name,
          type: node.firstChild!.type.name,
          text: node.firstChild!.textContent,
          users: mark.attrs["userIds"],
        });
      }
      return true;
    });
    return changed;
  } finally {
    view.close();
  }
}

function table(rows: number, cols: number): PartialBlock {
  return {
    id: "table",
    type: "table",
    content: {
      type: "tableContent",
      rows: Array.from({ length: rows }, (_, row) => ({
        cells: Array.from({ length: cols }, (_, col) => `${row}${col}`),
      })),
    },
  };
}

// The changes `blockMatchNodes` stores as a replaced block in the new binding.
// The old binding stored them inside the same block, which a diff can only
// render once the preview splits that block.
const structuralChanges: Array<{
  name: string;
  blocks: PartialBlock[];
  change: (editor: BlockNoteEditor) => void;
}> = [
  {
    name: "a type change",
    blocks: [
      { id: "changed", type: "paragraph", content: "Original" },
      { id: "next", type: "paragraph", content: "Next" },
    ],
    change: (editor) =>
      editor.updateBlock("changed", { type: "heading", props: { level: 2 } }),
  },
  {
    name: "a nesting change",
    blocks: [
      { id: "parent", type: "paragraph", content: "Parent" },
      { id: "child", type: "paragraph", content: "Child" },
    ],
    change: (editor) => {
      editor.setTextCursorPosition("child");
      editor.nestBlock();
    },
  },
  {
    name: "a table resize",
    blocks: [table(2, 2)],
    change: (editor) => editor.updateBlock("table", table(3, 3)),
  },
  {
    name: "a type change of a block with children",
    blocks: [
      {
        id: "changed",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
    change: (editor) =>
      editor.updateBlock("changed", { type: "heading", props: { level: 2 } }),
  },
  {
    name: "a type change and a text edit",
    blocks: [{ id: "changed", type: "paragraph", content: "Original" }],
    change: (editor) => {
      editor.updateBlock("changed", { type: "heading", props: { level: 2 } });
      editor.updateBlock("changed", { content: "Original title" });
    },
  },
];

describe("legacy Yjs document binding", () => {
  it("reads a multi-block document written by the old collaboration binding", () => {
    const legacy = createLegacyEditor();
    legacy.editor.replaceBlocks(legacy.editor.document, [
      {
        id: "heading-1",
        type: "heading",
        props: { level: 2 },
        content: "Title",
      },
      {
        id: "paragraph-1",
        type: "paragraph",
        content: [
          { type: "text", text: "Bold", styles: { bold: true } },
          { type: "text", text: " plain", styles: {} },
        ],
      },
    ]);

    const expected = legacy.editor.document;
    const update = Y1.encodeStateAsUpdateV2(legacy.doc);
    const current = openWithNewBinding(update);

    expect(current.editor.document).toEqual(expected);
    expect(current.editor.document.map((block) => block.id)).toEqual([
      "heading-1",
      "paragraph-1",
    ]);
    expect(current.doc.get("doc").length).toBe(1);
    expect(Y.encodeStateVector(current.doc)).toEqual(current.stateBeforeMount);
  });

  it("syncs edits from either binding to the other", () => {
    const legacy = createLegacyEditor();
    legacy.editor.replaceBlocks(legacy.editor.document, [
      { id: "shared", type: "paragraph", content: "Original" },
    ]);
    const current = openWithNewBinding(Y1.encodeStateAsUpdateV2(legacy.doc));

    legacy.editor.updateBlock("shared", {
      content: "Edited with y-prosemirror",
    });
    Y.applyUpdateV2(current.doc, Y1.encodeStateAsUpdateV2(legacy.doc));
    expect(current.editor.document.map((block) => block.id)).toEqual([
      "shared",
    ]);
    expect(current.editor.prosemirrorState.doc.textContent).toBe(
      "Edited with y-prosemirror",
    );
    expect(current.editor.document[0].content).toEqual(
      legacy.editor.document[0].content,
    );

    current.editor.updateBlock("shared", {
      content: "Edited with @y/prosemirror",
    });
    Y1.applyUpdateV2(legacy.doc, Y.encodeStateAsUpdateV2(current.doc));
    expect(legacy.editor.document.map((block) => block.id)).toEqual(["shared"]);
    expect(legacy.editor.prosemirrorState.doc.textContent).toBe(
      "Edited with @y/prosemirror",
    );
    expect(legacy.editor.document[0].content).toEqual(
      current.editor.document[0].content,
    );
  });

  it("syncs a block inserted by the old binding to the new one", () => {
    const legacy = createLegacyEditor();
    legacy.editor.replaceBlocks(legacy.editor.document, [
      { id: "shared", type: "paragraph", content: "Original" },
    ]);
    const current = openWithNewBinding(Y1.encodeStateAsUpdateV2(legacy.doc));

    legacy.editor.insertBlocks(
      [
        {
          id: "from-legacy",
          type: "heading",
          props: { level: 2 },
          content: "Old heading",
        },
      ],
      "shared",
      "after",
    );
    Y.applyUpdateV2(current.doc, Y1.encodeStateAsUpdateV2(legacy.doc));
    expect(current.editor.document).toEqual(legacy.editor.document);
    expect(current.editor.document.map((block) => block.id)).toEqual([
      "shared",
      "from-legacy",
    ]);
  });

  // y-prosemirror currently throws in createChildren when it encounters the
  // XmlText written by @y/prosemirror (sync-plugin.js reads type._item.right).
  it.fails("reads a block inserted by the new binding in the old one", () => {
    const legacy = createLegacyEditor();
    legacy.editor.replaceBlocks(legacy.editor.document, [
      { id: "shared", type: "paragraph", content: "Original" },
    ]);
    const current = openWithNewBinding(Y1.encodeStateAsUpdateV2(legacy.doc));

    current.editor.insertBlocks(
      [{ id: "from-new", type: "paragraph", content: "New paragraph" }],
      "shared",
      "after",
    );
    expect(current.editor.document.map((block) => block.id)).toEqual([
      "shared",
      "from-new",
    ]);
    Y1.applyUpdateV2(legacy.doc, Y.encodeStateAsUpdateV2(current.doc));
    expect(legacy.editor.document).toEqual(current.editor.document);
    expect(legacy.editor.document.map((block) => block.id)).toEqual([
      "shared",
      "from-new",
    ]);
  });

  it("diffs a block type change made with the new binding", () => {
    const current = openWithNewBinding(
      Y.encodeStateAsUpdateV2(new Y.Doc()),
      false,
      false,
    );
    current.editor.replaceBlocks(current.editor.document, [
      { id: "changed", type: "paragraph", content: "Original" },
    ]);
    const before = Y.encodeStateAsUpdateV2(current.doc);
    current.editor.updateBlock("changed", {
      type: "heading",
      props: { level: 2 },
    });
    const after = Y.encodeStateAsUpdateV2(current.doc);

    expect(diffBlocks(current.editor, current.doc, before, after)).toEqual([
      {
        change: "y-attributed-delete",
        type: "paragraph",
        text: "Original",
        users: ["author"],
      },
      {
        change: "y-attributed-insert",
        type: "heading",
        text: "Original",
        users: ["author"],
      },
    ]);
  });

  it.each(structuralChanges)(
    "diffs $name made with the old binding like one made with the new binding",
    ({ blocks, change }) => {
      const legacy = createLegacyEditor();
      legacy.editor.replaceBlocks(legacy.editor.document, blocks);
      const legacyBefore = Y1.encodeStateAsUpdateV2(legacy.doc);
      change(legacy.editor);
      const legacyAfter = Y1.encodeStateAsUpdateV2(legacy.doc);
      const fromLegacy = openWithNewBinding(legacyAfter);

      const current = openWithNewBinding(
        Y.encodeStateAsUpdateV2(new Y.Doc()),
        false,
        false,
      );
      current.editor.replaceBlocks(current.editor.document, blocks);
      const before = Y.encodeStateAsUpdateV2(current.doc);
      change(current.editor);
      const after = Y.encodeStateAsUpdateV2(current.doc);

      const expected = diffBlocks(current.editor, current.doc, before, after);
      expect(expected).not.toEqual([]);
      expect(
        diffBlocks(
          fromLegacy.editor,
          fromLegacy.doc,
          legacyBefore,
          legacyAfter,
        ),
      ).toEqual(expected);
    },
  );

  it("diffs a text edit made with the old binding in place", () => {
    const legacy = createLegacyEditor();
    legacy.editor.replaceBlocks(legacy.editor.document, [
      { id: "edited", type: "paragraph", content: "Original" },
    ]);
    const before = Y1.encodeStateAsUpdateV2(legacy.doc);
    legacy.editor.updateBlock("edited", { content: "Original edited" });
    const after = Y1.encodeStateAsUpdateV2(legacy.doc);
    const current = openWithNewBinding(after);

    // No block is replaced: only the inserted text is marked.
    expect(diffBlocks(current.editor, current.doc, before, after)).toEqual([]);
  });

  it("reads a comment overlapping a formatting mark and its thread", async () => {
    const legacy = createLegacyEditor(true);
    legacy.editor.replaceBlocks(legacy.editor.document, [
      {
        id: "commented-paragraph",
        type: "paragraph",
        content: [
          { type: "text", text: "before ", styles: {} },
          { type: "text", text: "bold words", styles: { bold: true } },
          { type: "text", text: " after", styles: {} },
        ],
      },
    ]);

    let from = -1;
    legacy.editor.prosemirrorState.doc.descendants((node, pos) => {
      if (node.isText && node.text === "bold words") {
        from = pos;
      }
    });
    expect(from).toBeGreaterThan(0);
    legacy.editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(tr.doc, from, from + "bold words".length),
      ),
    );
    await legacy.editor.getExtension(CommentsExtension)!.createThread({
      initialComment: {
        body: "Review these words",
        metadata: { source: "legacy" },
      },
      metadata: { status: "review" },
    });

    const [thread] = legacy.threadStore.getThreads().values();
    expect(thread).toBeDefined();
    const update = Y1.encodeStateAsUpdateV2(legacy.doc);
    const current = openWithNewBinding(update, true);

    const markedText: Array<{
      text: string;
      marks: string[];
      threadId?: string;
    }> = [];
    current.editor.prosemirrorState.doc.descendants((node) => {
      if (node.isText) {
        markedText.push({
          text: node.text!,
          marks: node.marks.map((mark) => mark.type.name),
          threadId: node.marks.find((mark) => mark.type.name === "comment")
            ?.attrs.threadId,
        });
      }
    });
    expect(markedText).toEqual([
      { text: "before ", marks: [], threadId: undefined },
      { text: "bold words", marks: ["bold", "comment"], threadId: thread.id },
      { text: " after", marks: [], threadId: undefined },
    ]);
    expect(current.editor.document.map((block) => block.id)).toEqual([
      "commented-paragraph",
    ]);
    expect(current.doc.get("doc").length).toBe(1);
    expect(current.threadStore.getThread(thread.id)).toMatchObject({
      id: thread.id,
      metadata: { status: "review" },
      comments: [
        {
          body: "Review these words",
          metadata: { source: "legacy" },
          userId: "author",
        },
      ],
    });
  });
});
