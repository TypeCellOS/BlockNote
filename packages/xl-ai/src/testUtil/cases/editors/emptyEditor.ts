import { BlockNoteEditor } from "@blocknote/core";
import { AIExtension } from "../../../AIExtension.js";

export function getEmptyEditor() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "",
      },
    ],
    trailingBlock: false,
    extensions: [AIExtension()],
  });
  return editor;
}
