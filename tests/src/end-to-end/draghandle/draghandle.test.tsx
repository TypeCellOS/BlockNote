import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { page, userEvent } from "../../utils/context.js";
import {
  BULLET_LIST_SELECTOR,
  DRAG_HANDLE_ADD_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  PARAGRAPH_SELECTOR,
  SLASH_MENU_SELECTOR,
} from "../../utils/const.js";
import { insertHeading } from "../../utils/copypaste.js";
import {
  getDragHandleYCoord,
  hoverAndAddBlockFromDragHandle,
} from "../../utils/draghandle.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  matchPageScreenshot,
  sleep,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import { MOD } from "../../utils/keyboard.js";
import { moveMouseOverElement } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

describe("Check Draghandle functionality", () => {
  beforeEach(async () => {
    await renderEditor(<App />);
    await focusOnEditor();
  });

  test("Should show draghandle when hovering over block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);

    await waitForSelector(DRAG_HANDLE_SELECTOR);
  });

  test("Draghandle should display next to correct block", async () => {
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  test("Draghandle should display next to correct nested block", async () => {
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(3);

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  test("Clicking draghandle should open menu", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    // Compare editor screenshot

    await sleep(1000);
    await matchPageScreenshot("draghandlemenu");
  });

  test("Clicking add button should create new block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await hoverAndAddBlockFromDragHandle(H_ONE_BLOCK_SELECTOR, "h2");
    await userEvent.keyboard("This is an h2");
    await waitForSelector(H_TWO_BLOCK_SELECTOR);

    await sleep(1000);
    await compareDocToSnapshot("draghandleadd");
  });

  test("Clicking add button should open menu", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));

    await waitForSelector(SLASH_MENU_SELECTOR);
  });

  test("Click add button hides drag handle", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await hoverAndAddBlockFromDragHandle(H_ONE_BLOCK_SELECTOR, "h2");
    await waitForSelectorDetached(DRAG_HANDLE_SELECTOR);

    await waitForSelectorDetached(DRAG_HANDLE_ADD_SELECTOR);
  });

  test("Click add button for non-selected empty block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    // Wait for animation to finish
    await sleep(350);
    await userEvent.keyboard("{Enter}");
    await hoverAndAddBlockFromDragHandle(PARAGRAPH_SELECTOR, "h1");

    await compareDocToSnapshot("addnonselectedemptyblock");
  });

  test("Clicking delete button should delete block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);

    await compareDocToSnapshot("draghandledelete");
  });

  test("Delete button should delete correct block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is h1");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is h2");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is h3");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);

    await compareDocToSnapshot("dragHandleDocStructure");
  });

  test("Delete button should delete all blocks in multi-block selection when hovered block is in selection", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("Heading 2");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("Heading 3");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("Bullet List");

    await userEvent.keyboard(
      `{Shift>}{ArrowUp}{${MOD}>}{ArrowLeft}{/${MOD}}{/Shift}`,
    );

    await moveMouseOverElement(H_THREE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);
    await waitForSelectorDetached(BULLET_LIST_SELECTOR);

    await compareDocToSnapshot("draghandledeletemultiselection");
  });

  test("Delete button should delete only hovered block when it is outside multi-block selection", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("Heading 2");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("Heading 3");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("Bullet List");

    await userEvent.keyboard(
      `{Shift>}{ArrowUp}{${MOD}>}{ArrowLeft}{/${MOD}}{/Shift}`,
    );

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);
    await waitForSelector(BULLET_LIST_SELECTOR);

    await compareDocToSnapshot("draghandledeletehoveroutsideselection");
  });

  test("Deleting block with children should delete all children", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is h1");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is h2");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is h3");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);

    await compareDocToSnapshot("draghandlenesteddelete");
  });
});
