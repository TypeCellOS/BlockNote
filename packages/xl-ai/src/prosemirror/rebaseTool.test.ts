import { BlockNoteEditor, getBlockInfo, getNodeById } from "@blocknote/core";
import { expect, it } from "vitest";
import { getApplySuggestionsTr, rebaseTool } from "./rebaseTool.js";

function getExampleEditorWithSuggestions() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "1",
        type: "paragraph",
        content: "HelloHi, world!", // "Hello" will be marked as deleted and "Hi" will be marked as inserted
      },
    ],
  });

  const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;

  const block = getBlockInfo(blockPos);
  if (!block.isBlockContainer) {
    throw new Error("Block is not a container");
  }

  editor.transact((tr) => {
    tr.addMark(
      block.blockContent.beforePos + 1,
      block.blockContent.beforePos + 6,
      editor.pmSchema.mark("deletion", {}),
    );

    tr.addMark(
      block.blockContent.beforePos + 6,
      block.blockContent.beforePos + 8,
      editor.pmSchema.mark("insertion", {}),
    );
  });

  return editor;
}

it("should create some example suggestions", async () => {
  const editor = getExampleEditorWithSuggestions();
  expect(editor.prosemirrorState.doc.toJSON()).toMatchSnapshot();
});

it("should be able to apply changes to a clean doc (use invertMap)", async () => {
  const editor = getExampleEditorWithSuggestions();

  const cleaned = rebaseTool(editor, getApplySuggestionsTr(editor));

  const blockPos = getNodeById("1", cleaned.doc)!;

  const block = getBlockInfo(blockPos);

  if (!block.isBlockContainer) {
    throw new Error("Block is not a container");
  }

  const start = block.blockContent.beforePos + 1;
  const end = start + 2;

  expect(cleaned.doc.textBetween(start, end)).toBe("Hi");

  editor.transact((tr) => {
    tr.replaceWith(
      cleaned.invertMap.map(start),
      cleaned.invertMap.map(end),
      editor.pmSchema.text("What's up"),
    );
  });

  expect(editor.prosemirrorState.doc.toJSON()).toMatchSnapshot();
});

it("should be able to apply changes to a clean doc (use rebaseTr)", async () => {
  const editor = getExampleEditorWithSuggestions();

  const cleaned = rebaseTool(editor, getApplySuggestionsTr(editor));

  const blockPos = getNodeById("1", cleaned.doc)!;

  const block = getBlockInfo(blockPos);

  if (!block.isBlockContainer) {
    throw new Error("Block is not a container");
  }

  const start = block.blockContent.beforePos + 1;
  const end = start + 2;

  expect(cleaned.doc.textBetween(start, end)).toBe("Hi");

  const tr = cleaned.tr();
  tr.replaceWith(start, end, editor.pmSchema.text("What's up"));

  expect(cleaned.rebaseTr(tr).doc.toJSON()).toMatchSnapshot();
});
