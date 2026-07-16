import App from "@examples/01-basic/03-multi-column/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import {
  COLUMN_TRAILING_BLOCK_SELECTOR,
  DOC_TRAILING_BLOCK_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect, moveMouseOverElement } from "../../utils/mouse.js";

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
