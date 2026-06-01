import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import {
  BACKGROUND_COLOR_SELECTOR,
  COLORS_BUTTON_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  TABLE_SELECTOR,
  TEXT_COLOR_SELECTOR,
} from "../../utils/const.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  focusOnEditor,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Background & Text Color Functionality", () => {
  test("Should be able to apply a text color mark", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await sleep(500);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard(`{${MOD}>}{Shift>}{ArrowRight}{/Shift}{/${MOD}}`);

    await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));
    await userEvent.click(await waitForSelector(TEXT_COLOR_SELECTOR("red")));

    await userEvent.keyboard("{ArrowLeft}");

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("textColorMark");
  });
  test("Should be able to apply a background color mark", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard(
      "{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}",
    );

    await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));
    await userEvent.click(
      await waitForSelector(BACKGROUND_COLOR_SELECTOR("red")),
    );

    await userEvent.keyboard("{ArrowLeft}");

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("backgroundColorMark");
  });
  test("Should be able to set block text color", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertParagraph();
    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    // WebKit needs the submenu's open animation to settle before its
    // children have non-zero bounding boxes — otherwise getRect() returns
    // (0,0,0,0) and clickAt(10,10) hits empty viewport space.
    await waitForSelector(TEXT_COLOR_SELECTOR("red"));
    await sleep(200);

    const { x, y } = getRect(TEXT_COLOR_SELECTOR("red"));
    await clickAt(x + 10, y + 10);

    // Waits for block side menu animation to finish.
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("blockTextColor");
  });
  test("Should be able to set block background color", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertParagraph();
    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    // See blockTextColor for why this sleep is needed (WebKit submenu open).
    await waitForSelector(BACKGROUND_COLOR_SELECTOR("red"));
    await sleep(200);

    const { x, y } = getRect(BACKGROUND_COLOR_SELECTOR("red"));
    await clickAt(x + 10, y + 10);

    // Waits for block side menu animation to finish.
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot(
      "blockBackgroundColor",
    );
  });
  // Regression test: prosemirror-tables' TableView.update() preserves the
  // NodeView's DOM without re-applying node attrs, so prop changes (e.g.
  // textColor) wouldn't propagate to the blockContent wrapper. BlockNoteTableView
  // overrides update() to sync prop-derived data-* attributes.
  test("Should be able to set block text color on a table", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    await userEvent.keyboard("Table Cell");

    await moveMouseOverElement(TABLE_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    // See blockTextColor for why this sleep is needed (WebKit submenu open).
    await waitForSelector(TEXT_COLOR_SELECTOR("red"));
    await sleep(200);

    const { x, y } = getRect(TEXT_COLOR_SELECTOR("red"));
    await clickAt(x + 10, y + 10);

    await expectElement(document.body).toMatchScreenshot("blockTextColorTable");
  });
});
