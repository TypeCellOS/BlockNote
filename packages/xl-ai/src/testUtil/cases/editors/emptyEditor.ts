import { BlockNoteEditor } from "@blocknote/core";
import { createAIExtension } from "../../../AIExtension.js";

export function getEmptyEditor() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "",
      },
    ],
    trailingBlock: false,
    extensions: [
      createAIExtension({
        model: undefined as any,
      }),
    ],
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
