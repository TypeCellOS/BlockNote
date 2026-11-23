import { BlockNoteSchema } from "@blocknote/core";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";

import { ColumnBlock, ColumnListBlock } from "../blocks/Columns/index.js";

export const testEditorSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    column: ColumnBlock,
    columnList: ColumnListBlock,
  } as const,
});

export type MultiColumnTestEditor = BlockNoteEditor<
  typeof testEditorSchema.blockSchema,
  typeof testEditorSchema.inlineContentSchema,
  typeof testEditorSchema.styleSchema
>;

const testDocument: PartialBlock<
  typeof testEditorSchema.blockSchema,
  typeof testEditorSchema.inlineContentSchema,
  typeof testEditorSchema.styleSchema
>[] = [
  {
    id: "paragraph-0",
    type: "paragraph",
    content: "Paragraph 0",
    children: [
      {
        id: "nested-paragraph-0",
        type: "paragraph",
        content: "Nested Paragraph 0",
      },
    ],
  },
  {
    id: "paragraph-1",
    type: "paragraph",
    content: "Paragraph 1",
  },
  {
    id: "column-list-0",
    type: "columnList",
    children: [
      {
        id: "column-0",
        type: "column",
        children: [
          {
            id: "column-paragraph-0",
            type: "paragraph",
            content: "Column Paragraph 0",
          },
          {
            id: "column-paragraph-1",
            type: "paragraph",
            content: "Column Paragraph 1",
          },
        ],
      },
      {
        id: "column-1",
        type: "column",
        children: [
          {
            id: "column-paragraph-2",
            type: "paragraph",
            content: "Column Paragraph 2",
          },
          {
            id: "column-paragraph-3",
            type: "paragraph",
            content: "Column Paragraph 3",
          },
        ],
      },
    ],
  },
  {
    id: "paragraph-2",
    type: "paragraph",
    content: "Paragraph 2",
  },
];

export const multiColumnTestOptions = {
  schema: testEditorSchema,
  initialContent: testDocument,
};

/** Keeps the command cases synchronous while the shared fixture owns each editor. */
export function setupTestEnv(test: {
  beforeEach(
    hook: (context: {
      setupEditor: (
        options: typeof multiColumnTestOptions,
      ) => Promise<{ editor: MultiColumnTestEditor }>;
    }) => Promise<void>,
  ): void;
}) {
  let editor: MultiColumnTestEditor;
  test.beforeEach(async ({ setupEditor }) => {
    ({ editor } = await setupEditor(multiColumnTestOptions));
  });
  return () => editor;
}
