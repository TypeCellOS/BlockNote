import {
  type Block,
  BlockNoteEditor,
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { testDocumentBlocks } from "@shared/testDocument.js";

import { flattenBlocks } from "../blocks/flatten.js";
import type { LensBlock } from "../blocks/types.js";

/**
 * A document with data that markdown and plain text do not show: colors,
 * alignment, a toggle, a paragraph in a bullet (markdown shows it without
 * nesting), empty paragraphs, underline, text color, image width, and table
 * cell colors.
 */
export const richDocument: PartialBlock[] = [
  {
    id: "colored",
    type: "paragraph",
    props: {
      textColor: "red",
      backgroundColor: "blue",
      textAlignment: "center",
    },
    content: "Colored centered paragraph",
  },
  {
    id: "heading",
    type: "heading",
    props: { level: 2 },
    content: [
      { type: "text", text: "Bold", styles: { bold: true } },
      { type: "text", text: " heading with ", styles: {} },
      {
        type: "text",
        text: "red underlined",
        styles: { textColor: "red", underline: true },
      },
      { type: "text", text: " text", styles: {} },
    ],
  },
  {
    id: "bullet",
    type: "bulletListItem",
    content: "Parent bullet",
    children: [
      { id: "child-bullet", type: "bulletListItem", content: "Child bullet" },
      {
        id: "child-paragraph",
        type: "paragraph",
        content: "Paragraph nested in a bullet",
      },
    ],
  },
  {
    id: "numbered",
    type: "numberedListItem",
    props: { start: 5 },
    content: "Numbered from 5",
  },
  {
    id: "checked",
    type: "checkListItem",
    props: { checked: true },
    content: "Checked item",
  },
  {
    id: "toggle",
    type: "toggleListItem",
    content: "Toggle",
    children: [
      { id: "toggle-child", type: "paragraph", content: "Inside the toggle" },
    ],
  },
  { id: "quote", type: "quote", content: "A quote" },
  {
    id: "code",
    type: "codeBlock",
    props: { language: "javascript" },
    content: "const x = 1;",
  },
  {
    id: "image",
    type: "image",
    props: {
      url: "https://example.com/image.png",
      caption: "Caption",
      previewWidth: 300,
      textAlignment: "right",
    },
  },
  { id: "empty-1", type: "paragraph" },
  { id: "empty-2", type: "paragraph" },
  { id: "hard-break", type: "paragraph", content: "line one\nline two" },
  { id: "divider", type: "divider" },
  {
    id: "table",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["A", "B"] },
        {
          cells: [
            {
              type: "tableCell",
              props: { backgroundColor: "yellow" },
              content: ["c"],
            },
            { type: "tableCell", content: ["d"] },
          ],
        },
      ],
    },
  },
  {
    id: "underlined",
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Underlined words here",
        styles: { underline: true },
      },
    ],
  },
  { id: "last", type: "paragraph", content: "Last paragraph" },
];

export function createEditor(initialContent: PartialBlock[] = richDocument) {
  return BlockNoteEditor.create({ initialContent });
}

/** Makes an editor with the shared test document (`shared/testDocumentBlocks.ts`). */
export function createSharedDocumentEditor() {
  return BlockNoteEditor.create({
    schema: withMultiColumn(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
    ),
    initialContent: testDocumentBlocks,
  });
}

/** Replaces the occurrence of `search` in `text`. Throws an error if there is not exactly one occurrence. */
export function replaceOnce(text: string, search: string, replacement: string) {
  const index = text.indexOf(search);
  if (index === -1 || text.indexOf(search, index + 1) !== -1) {
    throw new Error(
      `Expected exactly one occurrence of ${JSON.stringify(search)}`,
    );
  }
  return text.slice(0, index) + replacement + text.slice(index + search.length);
}

/** Returns the fields (type, props, content) of each block, by ID. */
export function blockFieldsById(
  editor: BlockNoteEditor<any, any, any>,
): Map<string, Omit<LensBlock, "id" | "children">> {
  const document: LensBlock[] = editor.document;
  return new Map(
    flattenBlocks(document).map(({ block }) => [
      block.id,
      { type: block.type, props: block.props, content: block.content },
    ]),
  );
}

/** Returns the IDs of the blocks with changed fields, and of the removed and added blocks. */
export function diffBlocks(
  before: ReturnType<typeof blockFieldsById>,
  after: ReturnType<typeof blockFieldsById>,
) {
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [id, fields] of before) {
    const afterFields = after.get(id);
    if (afterFields === undefined) {
      removed.push(id);
    } else if (JSON.stringify(afterFields) !== JSON.stringify(fields)) {
      changed.push(id);
    }
  }
  const added = [...after.keys()].filter((id) => !before.has(id));
  return { changed, removed, added };
}

/** Returns the top-level block IDs, with nested children. For example, `["a", ["b", ["c"]]]` if c is in b. */
export function documentShape(
  blocks: Block<any, any, any>[],
): (string | unknown[])[] {
  return blocks.flatMap((block) =>
    block.children.length > 0
      ? [block.id, documentShape(block.children)]
      : [block.id],
  );
}
