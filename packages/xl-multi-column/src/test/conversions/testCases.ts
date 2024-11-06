import { BlockNoteEditor, EditorTestCases } from "@blocknote/core";

import { testEditorSchema } from "../setupTestEnv.js";

export const multiColumnSchemaTestCases: EditorTestCases<
  typeof testEditorSchema.blockSchema,
  typeof testEditorSchema.inlineContentSchema,
  typeof testEditorSchema.styleSchema
> = {
  name: "multi-column-schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      schema: testEditorSchema,
    });
  },
  documents: [
    {
      name: "multi-column",
      blocks: [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Column Paragraph 0",
                },
                {
                  type: "paragraph",
                  content: "Column Paragraph 1",
                },
              ],
            },
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Column Paragraph 2",
                },
                {
                  type: "paragraph",
                  content: "Column Paragraph 3",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
