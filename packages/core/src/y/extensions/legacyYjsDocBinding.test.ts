/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";
import { TextSelection } from "prosemirror-state";
import * as Y1 from "yjs";

import { CommentsExtension } from "../../comments/extension.js";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YjsThreadStore as NewThreadStore } from "../comments/YjsThreadStore.js";
import { YjsThreadStore as LegacyThreadStore } from "../../yjs/comments/YjsThreadStore.js";
import { withCollaboration as withLegacyCollaboration } from "../../yjs/extensions/index.js";
import { withCollaboration } from "./index.js";

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

function openWithNewBinding(update: Uint8Array, withComments = false) {
  const doc = new Y.Doc();
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
