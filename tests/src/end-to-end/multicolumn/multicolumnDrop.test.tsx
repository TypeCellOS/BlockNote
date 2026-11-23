import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { browserName, MOD, page, userEvent } from "../../utils/context.js";
import {
  dragAndDropBlock,
  getRect,
  mouseSequence,
  startBlockDrag,
} from "../../utils/mouse.js";

// A two-column layout where the left column contains a single block, for
// reproducing drops that empty out a column. The right column's blocks are
// bullet list items, as multi-block selections of those produce drag
// fragments where the blocks are nested in a `blockGroup` node.
function setupTwoColumns(setupEditor: SetupEditor) {
  return setupEditor({
    schema: withMultiColumn(BlockNoteSchema.create()),
    dropCursor: multiColumnDropCursor,
    initialContent: [
      {
        type: "paragraph",
        content: "Paragraph outside columns",
      },
      {
        type: "columnList",
        children: [
          {
            type: "column",
            children: [
              {
                type: "paragraph",
                content: "Left column block",
              },
            ],
          },
          {
            type: "column",
            children: [
              {
                type: "bulletListItem",
                content: "Right block 1",
              },
              {
                type: "bulletListItem",
                content: "Right block 2",
              },
              {
                type: "bulletListItem",
                content: "Right block 3",
              },
            ],
          },
        ],
      },
    ],
  });
}

// Focuses the editor. Clicks a specific block instead of the editor itself,
// as the editor's center is covered by the side menu in this layout.
async function focusOnOutsideParagraph() {
  await userEvent.click(page.getByText("Paragraph outside columns").element());
}

// Returns a block's content element, which spans the full column width - the
// text element inside it hugs the text, so its edges are too far from the
// column's edges for an edge drop.
function blockContent(text: string) {
  return page.getByText(text).element().closest(".bn-block-content")!;
}

// A three-column layout where each column contains a single block, for
// reproducing edge drops where an emptied column precedes the drop target.
function setupThreeColumns(setupEditor: SetupEditor) {
  return setupEditor({
    schema: withMultiColumn(BlockNoteSchema.create()),
    dropCursor: multiColumnDropCursor,
    initialContent: [
      {
        type: "paragraph",
        content: "Paragraph outside columns",
      },
      {
        type: "columnList",
        children: [
          {
            type: "column",
            children: [{ type: "paragraph", content: "Column A block" }],
          },
          {
            type: "column",
            children: [{ type: "paragraph", content: "Column B block" }],
          },
          {
            type: "column",
            children: [{ type: "paragraph", content: "Column C block" }],
          },
        ],
      },
    ],
  });
}

// Playwright doesn't correctly simulate drag events in Firefox, hence the
// `skipIf`s.
describe("Check Multi-Column Drop Behaviour", () => {
  // Dragging the only block of a column to the other side of the column list
  // used to throw: the block was removed from the document before the column
  // list was updated, which dissolved the (then single-column) column list
  // that the update targeted.
  it.skipIf(browserName === "firefox")(
    "Check dragging a column's only block to a new column on the other side",
    async ({ setupEditor }) => {
      const { editor } = await setupTwoColumns(setupEditor);
      const [outside, list] = editor.document;
      const [left, right] = list.children;
      await focusOnOutsideParagraph();

      await dragAndDropBlock(
        page.getByText("Left column block").element(),
        blockContent("Right block 1"),
        false,
      );

      expect(editor.document).toMatchObject([
        outside,
        {
          ...list,
          children: [
            right,
            { type: "column", props: { width: 1 }, children: left.children },
          ],
        },
      ]);
      expect(editor.document[1].children[1].id).not.toBe(left.id);
    },
  );

  // The drop leaves a text cursor at the end of the dropped block, so typing
  // continues there (#3165).
  it.skipIf(browserName === "firefox")(
    "Check typing after dragging a block to a new column",
    async ({ setupEditor }) => {
      const { editor } = await setupTwoColumns(setupEditor);
      const [moved, list] = editor.document;
      const [left, right] = list.children;
      await focusOnOutsideParagraph();

      await dragAndDropBlock(
        page.getByText("Paragraph outside columns").element(),
        blockContent("Right block 2"),
        false,
      );
      expect(editor.document).toMatchObject([
        {
          ...list,
          children: [left, right, { type: "column", children: [moved] }],
        },
      ]);

      await userEvent.keyboard("X");

      expect(editor.getBlock(moved.id)?.content).toEqual([
        { type: "text", text: "Paragraph outside columnsX", styles: {} },
      ]);
    },
  );

  // The drop used to take several undo steps, the first of which removed the
  // dropped block (#3197).
  it.skipIf(browserName === "firefox")(
    "Check undoing a drag of a block to a new column",
    async ({ setupEditor }) => {
      const { editor } = await setupTwoColumns(setupEditor);
      await focusOnOutsideParagraph();
      const before = editor.document;

      await dragAndDropBlock(
        page.getByText("Paragraph outside columns").element(),
        blockContent("Right block 2"),
        false,
      );
      expect(editor.document).not.toEqual(before);

      await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
      expect(editor.document).toEqual(before);
    },
  );

  // Dragging a multi-block selection to the edge of a column used to only
  // move the first block of the selection into the new column, or throw when
  // the drag fragment nests the blocks in a `blockGroup` node.
  it.skipIf(browserName === "firefox")(
    "Check dragging multiple blocks to a new column",
    async ({ onTestFinished, setupEditor }) => {
      const { editor } = await setupTwoColumns(setupEditor);
      const [outside, list] = editor.document;
      const [left, right] = list.children;
      const [first, second, third] = right.children;
      editor.focus();
      editor.setSelection(first, second);
      expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
        first.id,
        second.id,
      ]);

      // Drags the selection to the right edge of the left column, which
      // should move both blocks into a new column between the two existing
      // ones. The drop target is the column element rather than its block
      // content so the pointer reaches the edge zone inside its right padding.
      const leftColumn = page
        .getByText("Left column block")
        .element()
        .closest(".bn-block-column")!;
      await startBlockDrag(
        page.getByText("Right block 1").element(),
        onTestFinished,
      );
      const target = getRect(leftColumn);
      const y = target.top + target.height / 2;
      // Chromium can omit the final dragover of a stepped move. Enter the
      // edge zone, then move again within it before checking the cursor.
      await mouseSequence([
        { type: "move", x: target.right - 6, y, steps: 5 },
        { type: "move", x: target.right - 1, y },
      ]);
      await expect
        .poll(
          () => {
            const column = getRect(leftColumn);
            const cursor = editor.domElement?.offsetParent?.querySelector(
              ".prosemirror-dropcursor-block-vertical-right",
            );
            if (!cursor) {
              return false;
            }
            const rect = getRect(cursor);
            return (
              Math.abs(rect.left + rect.width / 2 - column.right) <= 1 &&
              Math.abs(rect.top - column.top) <= 1 &&
              Math.abs(rect.bottom - column.bottom) <= 1
            );
          },
          {
            message: "The drop cursor should span the left column's right edge",
          },
        )
        .toBe(true);
      await mouseSequence([{ type: "up" }]);

      expect(editor.document).toMatchObject([
        outside,
        {
          ...list,
          children: [
            left,
            { type: "column", props: { width: 1 }, children: [first, second] },
            { ...right, children: [third] },
          ],
        },
      ]);
      expect(
        new Set(editor.document[1].children.map((column) => column.id)).size,
      ).toBe(3);
    },
  );

  // Dropping a column's only block on that column's own edge used to move
  // the block to the other side of the column list: the insertion index was
  // computed before the emptied column was filtered out, so it pointed one
  // slot too far to the right. It's now a no-op, so the document (including
  // the column's ID) should stay unchanged.
  it.skipIf(browserName === "firefox")(
    "Check dragging a column's only block to its own column's edge",
    async ({ setupEditor, onTestFinished }) => {
      const { editor } = await setupTwoColumns(setupEditor);
      const before = editor.document;
      await focusOnOutsideParagraph();

      const source = page.getByText("Left column block").element();
      const edge = source.closest(".bn-block-column")!;
      const drag = await startBlockDrag(source, onTestFinished);
      const { right, top, bottom } = getRect(edge);
      const listener = new AbortController();
      onTestFinished(() => listener.abort());
      let reachedEdge = false;
      document.addEventListener(
        "drop",
        (event) => {
          reachedEdge ||=
            event.isTrusted &&
            Math.abs(event.clientX - right) <= 2 &&
            event.clientY >= top &&
            event.clientY <= bottom;
        },
        { capture: true, signal: listener.signal },
      );

      await drag.drop(edge, false);

      expect(reachedEdge).toBe(true);
      expect(editor.document).toEqual(before);
    },
  );
});

describe("Check Multi-Column Drop Behaviour With Three Columns", () => {
  // Dragging the only block of the first column onto the second column's
  // right edge should place the new column directly after the second column.
  // The insertion index used to be computed before the emptied first column
  // was filtered out, which shifted the new column one slot too far to the
  // right (after the third column).
  it.skipIf(browserName === "firefox")(
    "Check dragging a column's only block to a later column's edge",
    async ({ setupEditor }) => {
      const { editor } = await setupThreeColumns(setupEditor);
      const [outside, list] = editor.document;
      const [a, b, c] = list.children;
      await focusOnOutsideParagraph();

      await dragAndDropBlock(
        page.getByText("Column A block").element(),
        page.getByText("Column B block").element().closest(".bn-block-column")!,
        false,
      );

      expect(editor.document).toMatchObject([
        outside,
        {
          ...list,
          children: [
            b,
            { type: "column", props: { width: 1 }, children: a.children },
            c,
          ],
        },
      ]);
      expect(editor.document[1].children[1].id).not.toBe(a.id);
    },
  );
});
