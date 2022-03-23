import { test, expect, Page } from "@playwright/test";
import {
  BASE_URL,
  BLOCK_SELECTOR,
  DRAGHANDLE,
  DRAGHANDLEADD,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  TIPPY_MENU,
} from "../../utils/const";
import {
  addBlockFromDragHandle,
  hoverAndAddBlockFromDragHandle,
} from "../../utils/draghandle";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import { moveMouseOverElement } from "../../utils/mouse";
import { executeSlashCommand } from "../../utils/slashmenu";

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
    await moveMouseOverElement(page, H_ONE_BLOCK_SELECTOR);
    await page.waitForSelector(DRAGHANDLE);
  });

  // TODO: add drag and drop test - playwright dragAndDrop function not working for some reason

  test("Clicking draghandle should open menu", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await moveMouseOverElement(page, H_ONE_BLOCK_SELECTOR);
    await page.click(DRAGHANDLE);
    await page.waitForSelector(TIPPY_MENU);
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
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await moveMouseOverElement(page, H_ONE_BLOCK_SELECTOR);
    await page.click(DRAGHANDLEADD);

    await page.waitForTimeout(1000);
    expect(
      await page.locator(BLOCK_SELECTOR).nth(1).screenshot()
    ).toMatchSnapshot("drag_add_filter_message.png");
  });

  test("Click add button hides drag handle", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await hoverAndAddBlockFromDragHandle(page, H_ONE_BLOCK_SELECTOR, "h2");
    await page.waitForSelector(DRAGHANDLE, { state: "detached" });
    await page.waitForSelector(DRAGHANDLEADD, { state: "detached" });
  });

  test("Clicking delete button should delete block", async () => {
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hover over this text");
    await page.hover(H_ONE_BLOCK_SELECTOR);
    await page.click(DRAGHANDLE);
    await page.waitForSelector(TIPPY_MENU);
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
    await page.click(DRAGHANDLE);
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
    await page.click(DRAGHANDLE);
    await page.click("text=Delete");
    await page.waitForSelector(H_ONE_BLOCK_SELECTOR);
    await page.waitForSelector(H_TWO_BLOCK_SELECTOR, { state: "detached" });
    await page.waitForSelector(H_THREE_BLOCK_SELECTOR, { state: "detached" });
  });
});
