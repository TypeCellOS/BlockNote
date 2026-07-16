import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { browserName, page, userEvent } from "../../utils/context.js";
import { compareDocToSnapshot, waitForSelector } from "../../utils/editor.js";
import { clickAt, dragAndDropBlock, getRect } from "../../utils/mouse.js";

// A two-column layout where the left column contains a single block, for
// reproducing drops that empty out a column. The right column's blocks are
// bullet list items, as multi-block selections of those produce drag
// fragments where the blocks are nested in a `blockGroup` node.
function TwoColumnApp() {
  const editor = useCreateBlockNote({
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

  return <BlockNoteView editor={editor} />;
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

// Playwright doesn't correctly simulate drag events in Firefox, hence the
// `skipIf`s.
describe("Check Multi-Column Drop Behaviour", () => {
  beforeEach(async () => {
    await render(<TwoColumnApp />);
    await waitForSelector(EDITOR_SELECTOR);
  });

  // Dragging the only block of a column to the other side of the column list
  // used to throw: the block was removed from the document before the column
  // list was updated, which dissolved the (then single-column) column list
  // that the update targeted.
  test.skipIf(browserName === "firefox")(
    "Check dragging a column's only block to a new column on the other side",
    async () => {
      await focusOnOutsideParagraph();

      await dragAndDropBlock(
        page.getByText("Left column block").element(),
        blockContent("Right block 1"),
        false,
      );

      await compareDocToSnapshot("dragOnlyBlockToOtherSide");
    },
  );

  // Dragging a multi-block selection to the edge of a column used to only
  // move the first block of the selection into the new column, or throw when
  // the drag fragment nests the blocks in a `blockGroup` node.
  test.skipIf(browserName === "firefox")(
    "Check dragging multiple blocks to a new column",
    async () => {
      await focusOnOutsideParagraph();

      // Selects the first two blocks in the right column.
      const firstBlockRect = getRect(page.getByText("Right block 1").element());
      await clickAt(firstBlockRect.x + 1, firstBlockRect.y + 1);
      await userEvent.keyboard("{Shift>}{ArrowDown}{ArrowRight}{/Shift}");

      // Drags the selection to the right edge of the left column, which
      // should move both blocks into a new column between the two existing
      // ones. The drop target is the column element rather than its block
      // content: the left column has right padding, and the column's edge
      // drop zone is narrower than it - so the drop must be inside the
      // padding.
      await dragAndDropBlock(
        page.getByText("Right block 1").element(),
        page
          .getByText("Left column block")
          .element()
          .closest(".bn-block-column")!,
        false,
      );

      await compareDocToSnapshot("dragMultipleBlocksToNewColumn");
    },
  );
});
