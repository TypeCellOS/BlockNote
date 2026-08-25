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

export function getSimpleEditorSpellingError() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world! Dow are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  return editor;
}
