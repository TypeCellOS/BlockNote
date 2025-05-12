import { BlockNoteEditor } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { createAIExtension } from "../../../AIExtension.js";

export function getEditorWithTables() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "Table Cell 6",
              ],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
            },
          ],
        },
      },
    ],
    schema,
    trailingBlock: false,
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
