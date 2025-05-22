import { BlockNoteEditor } from "@blocknote/core";
import { createAIExtension } from "../../../AIExtension.js";
import { schemaWithMention as schema } from "../schemas/mention.js";

export function getEditorWithBlockFormatting() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Colored text",
        props: {
          backgroundColor: "red",
        },
      },
      {
        id: "ref2",
        content: "Aligned text",
        props: {
          textAlignment: "right",
        },
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [
      createAIExtension({
        model: undefined as any,
      }),
    ],
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
