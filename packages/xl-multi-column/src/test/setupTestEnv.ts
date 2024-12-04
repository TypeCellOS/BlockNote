import {
  BlockNoteEditor,
  BlockNoteSchema,
  PartialBlock,
} from "@blocknote/core";
import { afterAll, beforeAll, beforeEach } from "vitest";

import { withMultiColumn } from "../blocks/schema.js";

export const testEditorSchema = withMultiColumn(BlockNoteSchema.create());

export function setupTestEnv() {
  let editor: BlockNoteEditor<
    typeof testEditorSchema.blockSchema,
    typeof testEditorSchema.inlineContentSchema,
    typeof testEditorSchema.styleSchema
  >;
  const div = document.createElement("div");

  beforeAll(() => {
    editor = BlockNoteEditor.create({
      schema: testEditorSchema,
    });
    editor.mount(div);
  });

  afterAll(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  beforeEach(() => {
    editor.replaceBlocks(editor.document, testDocument);
  });

  return () => editor;
}

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
  {
    id: "trailing-paragraph",
    type: "paragraph",
  },
];
