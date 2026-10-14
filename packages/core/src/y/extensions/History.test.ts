// @vitest-environment jsdom
import * as Y from "@y/y";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function createCollaborativeEditor(doc = new Y.Doc()) {
  cleanups.push(() => doc.destroy());
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  if (fragment.length === 0) {
    editor.replaceBlocks(editor.document, [
      { id: "paragraph", type: "paragraph", content: "Initial document" },
      { id: "other", type: "paragraph", content: "Other paragraph" },
    ]);
    blocksToYType(editor, editor.document, fragment);
  }

  const element = document.createElement("div");
  document.body.appendChild(element);
  cleanups.push(() => {
    editor.unmount();
    element.remove();
  });
  editor.mount(element);
  return { editor, doc };
}

it.each([
  {
    change: "insert",
    apply(editor: BlockNoteEditor) {
      editor.setTextCursorPosition("paragraph", "start");
      editor.insertInlineContent("Local ");
    },
  },
  {
    change: "remove",
    apply(editor: BlockNoteEditor) {
      editor.removeBlocks(["paragraph"]);
    },
  },
  {
    change: "format",
    apply(editor: BlockNoteEditor) {
      editor.updateBlock("paragraph", {
        content: [
          { type: "text", text: "Initial document", styles: { bold: true } },
        ],
      });
    },
  },
])(
  "undoes and redoes a local $change in a collaborative document",
  (testCase) => {
    const { editor, doc } = createCollaborativeEditor();
    const initial = editor.document;
    expect(initial[0].content).toEqual([
      { type: "text", text: "Initial document", styles: {} },
    ]);
    expect(editor.undo()).toBe(false);
    expect(editor.redo()).toBe(false);

    testCase.apply(editor);
    const changed = editor.document;
    expect(changed).not.toEqual(initial);
    expect(yDocToBlocks(editor, doc, "doc")).toEqual(changed);

    expect(editor.undo()).toBe(true);
    expect(editor.document).toEqual(initial);
    expect(yDocToBlocks(editor, doc, "doc")).toEqual(initial);
    expect(editor.undo()).toBe(false);
    expect(editor.redo()).toBe(true);
    expect(editor.document).toEqual(changed);
    expect(yDocToBlocks(editor, doc, "doc")).toEqual(changed);
    expect(editor.redo()).toBe(false);
  },
);

it("maps local undo and redo across remote insertions without recording remote edits", () => {
  const { editor, doc } = createCollaborativeEditor();
  const remoteDoc = new Y.Doc();
  Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
  const { editor: remote } = createCollaborativeEditor(remoteDoc);

  editor.setTextCursorPosition("paragraph", "start");
  editor.insertInlineContent("Local ");
  Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
  expect(remote.undo()).toBe(false);
  remote.setTextCursorPosition("paragraph", "start");
  remote.insertInlineContent("Remote ");
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(remoteDoc));
  expect(editor.document[0].content).toEqual([
    { type: "text", text: "Remote Local Initial document", styles: {} },
  ]);

  expect(editor.undo()).toBe(true);
  expect(editor.document[0].content).toEqual([
    { type: "text", text: "Remote Initial document", styles: {} },
  ]);
  expect(editor.undo()).toBe(false);
  Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
  expect(remote.document).toEqual(editor.document);

  expect(editor.redo()).toBe(true);
  expect(editor.document[0].content).toEqual([
    { type: "text", text: "Remote Local Initial document", styles: {} },
  ]);
  expect(editor.redo()).toBe(false);
  Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
  expect(remote.document).toEqual(editor.document);
});
