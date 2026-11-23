import * as Y from "@y/y";
import { expect } from "vite-plus/test";

import type { CommandContext } from "../../../../../tests/src/commands/index.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

async function createCollaborativeEditor(
  { setupEditor }: Pick<CommandContext, "setupEditor">,
  doc: Y.Doc,
) {
  const fragment = doc.get("doc");
  if (fragment.length === 0) {
    const { editor: seed } = await setupEditor({
      mountType: false,
      initialContent: [
        { id: "paragraph", type: "paragraph", content: "Initial document" },
        { id: "other", type: "paragraph", content: "Other paragraph" },
      ],
    });
    blocksToYType(seed, seed.document, fragment);
  }
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  });
  return editor;
}

it.for([
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
  async (testCase, { setupEditor, onTestFinished }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const editor = await createCollaborativeEditor({ setupEditor }, doc);
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

it("maps local undo and redo across remote insertions without recording remote edits", async ({
  setupEditor,
  onTestFinished,
}) => {
  const doc = new Y.Doc();
  const remoteDoc = new Y.Doc();
  onTestFinished(() => {
    remoteDoc.destroy();
    doc.destroy();
  });
  const fixtures = { setupEditor };
  const editor = await createCollaborativeEditor(fixtures, doc);
  Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
  const remote = await createCollaborativeEditor(fixtures, remoteDoc);

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
