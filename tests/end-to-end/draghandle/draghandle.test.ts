import { test, expect, Page } from "@playwright/test";
import {
  BASE_URL,
  BLOCK_CONTENT_SELECTOR,
  BLOCK_SELECTOR,
  DRAG_HANDLE,
  DRAG_HANDLE_ADD,
  DRAG_HANDLE_MENU_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  SLASH_MENU_SELECTOR,
} from "../../utils/const";
import {
  getDragHandleYCoord,
  hoverAndAddBlockFromDragHandle,
} from "../../utils/draghandle";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import { moveMouseOverElement } from "../../utils/mouse";
import { executeSlashCommand } from "../../utils/slashmenu";
import { insertHeading } from "../../utils/copypaste";

let page: Page;

test.describe("Check Draghandle functionality", () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.beforeEach(async () => {
    page.goto(BASE_URL, { waitUntil: "networkidle" });
    await focusOnEditor(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Should show draghandle when hovering over block", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    const heading = await page.locator(H_ONE_BLOCK_SELECTOR);
    await moveMouseOverElement(page, heading);
    await page.waitForSelector(DRAG_HANDLE);
  });

  test("Draghandle should display next to correct block", async () => {
    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    const h1y = await getDragHandleYCoord(page, H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(page, H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(page, H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y && h1y < h3y && h2y < h3y).toBeTruthy();
  });

  test("Draghandle should display next to correct nested block", async () => {
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    const h1y = await getDragHandleYCoord(page, H_ONE_BLOCK_SELECTOR);
    await page.pause();
    const h2y = await getDragHandleYCoord(page, H_TWO_BLOCK_SELECTOR);
    await page.pause();
    const h3y = await getDragHandleYCoord(page, H_THREE_BLOCK_SELECTOR);
    await page.pause();
    expect(h1y < h2y && h1y < h3y && h2y < h3y).toBeTruthy();
  });

  test("Clicking draghandle should open menu", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    const heading = await page.locator(H_ONE_BLOCK_SELECTOR).first();
    await moveMouseOverElement(page, heading);
    await page.click(DRAG_HANDLE);
    await page.waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    // Compare editor screenshot
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot("draghandlemenu.png");
  });

  test("Clicking add button should create new block", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await hoverAndAddBlockFromDragHandle(page, H_ONE_BLOCK_SELECTOR, "h2");
    await page.keyboard.type("This is an h2");
    await page.waitForSelector(H_TWO_BLOCK_SELECTOR);

    await page.waitForTimeout(1000);
    await compareDocToSnapshot(page, "draghandleadd");
  });

  test("Clicking add button should show filter message", async () => {
    const block = await page.locator(BLOCK_SELECTOR);
    await moveMouseOverElement(page, block);
    await page.click(DRAG_HANDLE_ADD);
    const content = await page.waitForSelector(BLOCK_CONTENT_SELECTOR);
    // Get text in :before
    const text = await content.evaluate((el) =>
      window
        .getComputedStyle(el.children[0], ":before")
        .getPropertyValue("content")
    );
    expect(text).toBe('"Type to filter"');
  });

  test("Clicking add button should open menu", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    const heading = await page.locator(H_ONE_BLOCK_SELECTOR);
    await moveMouseOverElement(page, heading);
    await page.click(DRAG_HANDLE_ADD);
    await page.waitForSelector(SLASH_MENU_SELECTOR);
  });

  test("Click add button hides drag handle", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await hoverAndAddBlockFromDragHandle(page, H_ONE_BLOCK_SELECTOR, "h2");
    await page.waitForSelector(DRAG_HANDLE, { state: "detached" });
    await page.waitForSelector(DRAG_HANDLE_ADD, { state: "detached" });
  });

  test("Clicking delete button should delete block", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await page.hover(H_ONE_BLOCK_SELECTOR);
    await page.click(DRAG_HANDLE);
    await page.waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.click("text=Delete");
    await page.locator(H_ONE_BLOCK_SELECTOR).waitFor({ state: "detached" });
  });

  test("Delete button should delete correct block", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("This is h1");
    await executeSlashCommand(page, "h2");
    await page.keyboard.type("This is h2");
    await executeSlashCommand(page, "h3");
    await page.keyboard.type("This is h3");
    await page.hover(H_TWO_BLOCK_SELECTOR);
    await page.click(DRAG_HANDLE);
    await page.click("text=Delete");
    await page.waitForSelector(H_ONE_BLOCK_SELECTOR);
    await page.waitForSelector(H_TWO_BLOCK_SELECTOR, { state: "detached" });
    await page.waitForSelector(H_THREE_BLOCK_SELECTOR);
    // Compare doc object snapshot
    await compareDocToSnapshot(page, "dragHandleDocStructure");
  });

  test("Deleting block with children should delete all children", async () => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await focusOnEditor(page);
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("This is h1");
    await page.keyboard.press("Enter", { delay: 10 });
    await page.keyboard.press("Tab", { delay: 10 });
    await executeSlashCommand(page, "h2");
    await page.keyboard.type("This is h2");
    await page.keyboard.press("Enter", { delay: 10 });
    await page.keyboard.press("Tab", { delay: 10 });
    await executeSlashCommand(page, "h3");
    await page.keyboard.type("This is h3");
    await page.hover(H_TWO_BLOCK_SELECTOR);
    await page.click(DRAG_HANDLE);
    await page.click("text=Delete");
    await page.waitForSelector(H_ONE_BLOCK_SELECTOR);
    await page.waitForSelector(H_TWO_BLOCK_SELECTOR, { state: "detached" });
    await page.waitForSelector(H_THREE_BLOCK_SELECTOR, { state: "detached" });
  });
});
