import { BlockNoteEditor } from "@blocknote/core";
import { createAIExtension } from "../../../AIExtension.js";
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
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
