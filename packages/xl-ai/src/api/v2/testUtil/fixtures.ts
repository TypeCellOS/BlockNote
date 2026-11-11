import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { testDocumentBlocks } from "@shared/testDocument.js";

import {
  type ChangeOperations,
  getDocumentText,
  type TextFormat,
  updateDocument,
} from "../index.js";
import { flattenBlocks } from "../util/blocks/flatten.js";
import type { LensBlock, LensStyledText, LensStyles } from "../model.js";
import { valid } from "./valid.js";

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

/** The default blocks, with the column blocks. */
export const columnSchema = withMultiColumn(
  BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
);

/** An editor with two columns: "Alpha" (block a) in column c1 and "Beta" (block b) in column c2. */
export function createColumnsEditor() {
  return BlockNoteEditor.create({
    schema: columnSchema,
    initialContent: [
      {
        id: "list",
        type: "columnList",
        children: [
          {
            id: "c1",
            type: "column",
            children: [{ id: "a", type: "paragraph", content: "Alpha" }],
          },
          {
            id: "c2",
            type: "column",
            children: [{ id: "b", type: "paragraph", content: "Beta" }],
          },
        ],
      },
    ],
  });
}

/**
 * An editor with a tab set, a layout block that does not dissolve (as
 * `tabs` in the layout tests of core): tab t1 with "One" (block a), and tab
 * t2 with "Two" (block b). The tab set has at least `min` tabs. It needs a
 * DOM (the frame of a layout block).
 */
export function createTabsEditor(min = 1) {
  const frame = () => {
    const dom = document.createElement("div");
    return { dom, slot: dom };
  };
  const tabs = createBlockSpec(
    {
      type: "tabs" as const,
      propSchema: {},
      content: "none",
      layoutOnly: true,
      children: { allow: ["tab"], min, dissolve: false },
    },
    { renderFrame: frame },
  )();
  const tab = createBlockSpec(
    {
      type: "tab" as const,
      propSchema: {},
      content: "none",
      layoutOnly: true,
      placeable: "namedOnly",
    },
    { renderFrame: frame },
  )();
  return BlockNoteEditor.create({
    schema: BlockNoteSchema.create().extend({
      blockSpecs: { ...defaultBlockSpecs, tabs, tab },
    }),
    initialContent: [
      {
        id: "set",
        type: "tabs",
        children: [
          {
            id: "t1",
            type: "tab",
            children: [{ id: "a", type: "paragraph", content: "One" }],
          },
          {
            id: "t2",
            type: "tab",
            children: [{ id: "b", type: "paragraph", content: "Two" }],
          },
        ],
      },
    ] as PartialBlock<any, any, any>[],
  });
}

/** A bullet "Fruit" with the bullets "Apples" and "Pears" as children, and a paragraph "End". */
export const fruitDocument: PartialBlock[] = [
  {
    id: "fruit",
    type: "bulletListItem",
    content: "Fruit",
    children: [
      { id: "apples", type: "bulletListItem", content: "Apples" },
      { id: "pears", type: "bulletListItem", content: "Pears" },
    ],
  },
  { id: "end", type: "paragraph", content: "End" },
];

/** Writes the text of the editor, changed by `edit`, back to the editor. The write must be valid. */
export function writeText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  edit: (text: string) => string,
): ChangeOperations {
  const text = edit(getDocumentText(editor, format));
  return valid(updateDocument(editor, { base: "current", format, text }));
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

type Tree = { id: string; children: readonly Tree[] };

/** Returns the top-level block IDs, with nested children. For example, `["a", ["b", ["c"]]]` if c is in b. */
export function documentShape(blocks: readonly Tree[]): (string | unknown[])[] {
  return blocks.flatMap((block) =>
    block.children.length > 0
      ? [block.id, documentShape(block.children)]
      : [block.id],
  );
}

/** A text item of inline content, with the styles. */
export function styledText(
  value: string,
  styles: LensStyles = {},
): LensStyledText {
  return { type: "text", text: value, styles };
}
