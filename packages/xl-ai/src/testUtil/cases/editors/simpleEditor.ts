import { BlockNoteEditor } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { createAIExtension } from "../../../AIExtension.js";

export function getSimpleEditor() {
  return BlockNoteEditor.create({
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
}
