import { BlockNoteEditor } from "@blocknote/core";

import { testEditorSchema } from "../setupTestEnv.js";

// TODO
export const multiColumnSchemaTestCases: any = {
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
