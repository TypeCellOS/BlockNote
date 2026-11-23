import type { multiColumnTestOptions } from "../setupTestEnv.js";

export const multiColumnSchemaTestCases = {
  name: "multi-column-schema",
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
} satisfies {
  name: string;
  documents: {
    name: string;
    blocks: typeof multiColumnTestOptions.initialContent;
  }[];
};
