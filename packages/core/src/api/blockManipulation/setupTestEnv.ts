import { afterAll, beforeAll, beforeEach } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

/**
 * Mounts an editor for a test file and resets its document before each test.
 *
 * Called without arguments it uses the default schema and {@link testDocument}.
 * A custom schema and document have to be passed together, since a document is
 * only valid against the schema it was written for.
 */
export function setupTestEnv<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(options?: {
  schema: BlockNoteSchema<B, I, S>;
  document: PartialBlock<B, I, S>[];
}): () => BlockNoteEditor<B, I, S> {
  let editor: BlockNoteEditor<B, I, S>;
  const div = document.createElement("div");

  beforeAll(() => {
    // `B`/`I`/`S` fall back to the default schema's types, but TS can't see
    // that from inside the body, so the no-options branch needs a cast.
    editor = options
      ? BlockNoteEditor.create({ schema: options.schema })
      : (BlockNoteEditor.create() as unknown as BlockNoteEditor<B, I, S>);
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  beforeEach(() => {
    editor.replaceBlocks(
      editor.document,
      options?.document ?? (testDocument as unknown as PartialBlock<B, I, S>[]),
    );
  });

  return () => editor;
}

export const testDocument: PartialBlock[] = [
  {
    id: "paragraph-0",
    type: "paragraph",
    content: "Paragraph 0",
  },
  {
    id: "paragraph-1",
    type: "paragraph",
    content: "Paragraph 1",
  },
  {
    id: "paragraph-with-children",
    type: "paragraph",
    content: "Paragraph with children",
    children: [
      {
        id: "nested-paragraph-0",
        type: "paragraph",
        content: "Nested Paragraph 0",
        children: [
          {
            id: "double-nested-paragraph-0",
            type: "paragraph",
            content: "Double Nested Paragraph 0",
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
    id: "paragraph-with-props",
    type: "paragraph",
    props: {
      textAlignment: "center",
      textColor: "red",
    },
    content: "Paragraph with props",
  },
  {
    id: "paragraph-3",
    type: "paragraph",
    content: "Paragraph 3",
  },
  {
    id: "paragraph-with-styled-content",
    type: "paragraph",
    content: [
      { type: "text", text: "Paragraph", styles: { bold: true } },
      { type: "text", text: " with styled ", styles: {} },
      { type: "text", text: "content", styles: { italic: true } },
    ],
  },
  {
    id: "paragraph-4",
    type: "paragraph",
    content: "Paragraph 4",
  },
  {
    id: "heading-0",
    type: "heading",
    content: "Heading 1",
  },
  {
    id: "paragraph-5",
    type: "paragraph",
    content: "Paragraph 5",
  },
  {
    id: "image-0",
    type: "image",
    props: {
      url: "https://via.placeholder.com/150",
    },
  },
  {
    id: "paragraph-6",
    type: "paragraph",
    content: "Paragraph 6",
  },
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              content: ["Cell 1"],
            },
            {
              type: "tableCell",
              content: ["Cell 2"],
            },
            {
              type: "tableCell",
              content: ["Cell 3"],
            },
          ],
        },
        {
          cells: ["Cell 4", "Cell 5", "Cell 6"],
        },
        {
          cells: ["Cell 7", "Cell 8", "Cell 9"],
        },
      ],
    },
  },
  {
    id: "paragraph-7",
    type: "paragraph",
    content: "Paragraph 7",
  },
  {
    id: "empty-paragraph",
    type: "paragraph",
    content: "",
  },
  {
    id: "paragraph-8",
    type: "paragraph",
    content: "Paragraph 8",
  },
  {
    id: "heading-with-everything",
    type: "heading",
    props: {
      backgroundColor: "red",
      level: 2,
      textAlignment: "center",
      textColor: "red",
    },
    content: [
      { type: "text", text: "Heading", styles: { bold: true } },
      { type: "text", text: " with styled ", styles: {} },
      { type: "text", text: "content", styles: { italic: true } },
    ],
    children: [
      {
        id: "nested-paragraph-1",
        type: "paragraph",
        content: "Nested Paragraph 1",
        children: [
          {
            id: "double-nested-paragraph-1",
            type: "paragraph",
            content: "Double Nested Paragraph 1",
          },
        ],
      },
    ],
  },
  {
    id: "paragraph-9",
    type: "paragraph",
  },
];
