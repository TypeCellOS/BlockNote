import App from "@examples/01-basic/03-multi-column/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import {
  COLUMN_TRAILING_BLOCK_SELECTOR,
  DOC_TRAILING_BLOCK_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import {
  clickAt,
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Multi-Column Behaviour", () => {
  test("Check Delete before column", async () => {
    await focusOnEditor();

    const target = page
      .getByText("You can have multiple blocks in a column too")
      .element();
    const targetRect = getRect(target);
    await clickAt(targetRect.x + 1, targetRect.y + 1);
    await userEvent.keyboard("{ArrowLeft}");

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumn");
  });
  test("Check Delete before column with single block", async () => {
    await focusOnEditor();

    // Clicks the end of the column's single block. Clicking the column itself
    // would hit its trailing block widget and append a new block instead.
    const target = page.getByText("This paragraph is in a column!").element();
    const range = document.createRange();
    range.selectNodeContents(target);
    const lineRects = range.getClientRects();
    const lastLineRect = lineRects[lineRects.length - 1];
    await clickAt(
      lastLineRect.right - 1,
      lastLineRect.y + lastLineRect.height / 2,
    );

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumnWithSingleBlock");
  });
  test("Check Delete before column list", async () => {
    await focusOnEditor();

    await userEvent.click(await waitForSelector(".bn-block-content"));

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumnList");
  });
  test("Check column borders stay visible when hovering the side menu", async () => {
    await focusOnEditor();

    // Hovering a block in a column shows the borders between the columns.
    await moveMouseOverElement(page.getByText("So is this heading!").element());
    await waitForSelector(".bn-column-list-hovered");

    // The borders must stay visible when the mouse moves onto the side menu,
    // which is rendered over the boundary between the first two columns.
    await moveMouseOverElement(await waitForSelector(".bn-side-menu"));
    expect(document.querySelector(".bn-column-list-hovered")).not.toBeNull();
  });
  test("Check resize border hides when hovering a side menu button", async () => {
    await focusOnEditor();

    // Hovering a block in a column shows the side menu for it.
    const heading = page.getByText("So is this heading!").element();
    await moveMouseOverElement(heading);
    await waitForSelector(".bn-side-menu");

    // Moving the mouse near the boundary between the first two columns shows
    // the resize border on it.
    const headingRect = getRect(heading);
    const columnRect = getRect(heading.closest(".bn-block-column")!);
    await mouseSequence([
      {
        type: "move",
        x: columnRect.x + 5,
        y: headingRect.y + headingRect.height / 2,
        steps: 5,
      },
    ]);
    await waitForSelector(".bn-column-resize-border");

    // Hovering one of the side menu's buttons hides the resize border, as the
    // button is the likelier target there, while the lighter separators
    // between the columns stay visible.
    await moveMouseOverElement(await waitForSelector(DRAG_HANDLE_SELECTOR));
    expect(document.querySelector(".bn-column-resize-border")).toBeNull();
    expect(document.querySelector(".bn-column-list-hovered")).not.toBeNull();
  });
  test("Check clicking a column's trailing block appends a block to the column", async () => {
    await focusOnEditor();

    // The first column is shorter than its siblings, so its trailing block
    // widget fills the leftover space below its last block (#2820).
    await userEvent.click(
      await waitForSelector(COLUMN_TRAILING_BLOCK_SELECTOR),
    );
    await userEvent.keyboard("Inside the column");

    await compareDocToSnapshot("trailingBlockInColumn");
  });
  test("Check Delete end of column list", async () => {
    await focusOnEditor();

    await userEvent.click(await waitForSelector(DOC_TRAILING_BLOCK_SELECTOR));
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard("{ArrowLeft}");

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteEndOfColumnList");
  });
});

// Which block the side menu attaches to is resolved from live layout
// (`elementsFromPoint` / `posAtCoords`); the geometry pieces below that are
// unit-tested in `packages/core/src/extensions/SideMenu/
// sideMenuContainerGeometry.browser.test.ts`. This tests the whole path,
// through a real column list. Hovering a column's left padding hands the
// lookup coordinates that horizontally overlap the previous column, and
// `SideMenu.ts` only resolves the right block by re-probing further right
// once `isHorizontalContainer` recognises the column list. If that
// compensation (or the detection) breaks, the menu attaches to a block in
// the previous column.
describe("Check side menu placement inside a column list", () => {
  /** Vertical centre of a rect, which the menu lines itself up with. */
  const centerY = (rect: DOMRect) => rect.y + rect.height / 2;

  test("Check drag handle resolves the block on the hovered row of a column", async () => {
    await focusOnEditor();

    // The last column is the only one holding several blocks, so it's the only
    // place a wrongly resolved block is distinguishable by its row.
    const target = page.getByText("Block 2").element();
    const columnRect = getRect(target.closest(".bn-block-column")!);

    await mouseSequence([
      {
        type: "move",
        x: columnRect.x + 5,
        y: centerY(getRect(target)),
        steps: 5,
      },
    ]);
    await waitForSelector(DRAG_HANDLE_SELECTOR);
    await sleep(150);
    const handleRect = getRect(DRAG_HANDLE_SELECTOR);

    expect(handleRect.x).toBeLessThan(getRect(target).x);

    // The handle lines up with the hovered block's row rather than any other
    // block's. This is a stronger check than a pixel tolerance, since every
    // candidate is only a line-height away, and it is what distinguishes
    // this column's blocks from the neighbouring column's.
    const distance = (rect: DOMRect) =>
      Math.abs(centerY(handleRect) - centerY(rect));
    for (const other of ["Block 1", "Block 3", "So is this heading!"]) {
      expect(distance(getRect(target))).toBeLessThan(
        distance(getRect(page.getByText(other).element())),
      );
    }
  });
});
