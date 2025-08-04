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
        executor: undefined as any, // disable
      }),
    ],
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
