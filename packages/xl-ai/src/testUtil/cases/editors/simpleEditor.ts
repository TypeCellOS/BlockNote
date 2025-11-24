import { BlockNoteEditor } from "@blocknote/core";
import { AIExtension } from "../../../AIExtension.js";
import { schemaWithMention as schema } from "../schemas/mention.js";

export function getSimpleEditor() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: "How are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  return editor;
}

export function getSimpleEditorWithCursorBetweenBlocks() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: "",
      },
      {
        id: "ref3",
        content: "How are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  editor.setTextCursorPosition("ref2");
  return editor;
}
