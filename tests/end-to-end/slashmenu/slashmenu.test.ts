import { test, expect, Page, ElementHandle } from "@playwright/test";
import {
  BASE_URL,
  BLOCK_GROUP_SELECTOR,
  BLOCK_SELECTOR,
  BULLET_LIST_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  NUMBERED_LIST_SELECTOR,
} from "../../utils/const";
import {
  focusOnEditor,
  waitForSelectorInEditor,
  compareDocToSnapshot,
} from "../../utils/editor";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu";

const TYPE_DELAY = 10;

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check SlashMenu Functionality", () => {
  test("should show slash menu when / is typed", async ({ page }) => {
    await focusOnEditor(page);
    await openSlashMenu(page);
  });
  test("Should be able to create h1", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("This is a H1");
    await waitForSelectorInEditor(page, H_ONE_BLOCK_SELECTOR);
  });
  test("Should be able to create h2", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h2");
    await page.keyboard.type("This is a H2");
    await waitForSelectorInEditor(page, H_TWO_BLOCK_SELECTOR);
  });
  test("Should be able to create h3", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h3");
    await page.keyboard.type("This is a H3");
    await waitForSelectorInEditor(page, H_THREE_BLOCK_SELECTOR);
  });
  test("Should be able to create numbered list", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "numbered");
    await page.keyboard.type("This is a numbered list");
    await waitForSelectorInEditor(page, NUMBERED_LIST_SELECTOR);
  });
  test("Should be able to create bullet list", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "bullet");
    await page.keyboard.type("This is a bullet list");
    await waitForSelectorInEditor(page, BULLET_LIST_SELECTOR);
  });
  test("Should be able to create paragraph", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "paragraph");
    await page.keyboard.type("This is a Paragraph");
    const block = page.locator(BLOCK_SELECTOR).nth(0);
    const blockHeadingType = await block.getAttribute("headingtype");
    expect(blockHeadingType).toBeFalsy();
  });
  test("Should add block as sibling of current block if block has content", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("Hello");
    await executeSlashCommand(page, "h2");
    // If done correctly all blocks should be in the same block group
    // resulting in a total of 1 block group.
    const blockGroupCount = await page.locator(BLOCK_GROUP_SELECTOR).count();
    expect(blockGroupCount).toBe(1);
  });
  test("Should add new block after current blocks children", async ({
    page,
  }) => {
    // BLOCK_A /(create Block_C)
    //        BLOCK_B
    //
    // When adding a new block after Block_A, it should be added
    // As a sibling of Block_A, beneath it
    //
    // BLOCK_A
    //        BLOCK_B
    // BLOCK_C
    await focusOnEditor(page);
    await page.keyboard.type("A");
    await page.keyboard.press("Enter", { delay: TYPE_DELAY });
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await page.keyboard.type("B");
    await page.keyboard.press("ArrowUp", { delay: TYPE_DELAY });
    await executeSlashCommand(page, "h1");
    await page.waitForSelector(H_ONE_BLOCK_SELECTOR);
    // If done correctly there should be a total on 2 block groups
    // a total of 4 blocks and the 3rd block should have no blockgroup
    // and BLOCK_A should have one child
    const blockGroupCount = await page.locator(BLOCK_GROUP_SELECTOR).count();
    expect(blockGroupCount).toBe(2);
    const blockCount = await page.locator(BLOCK_SELECTOR).count();
    expect(blockCount).toBe(4);
    const thirdBlock = page.locator(BLOCK_SELECTOR).nth(2);
    await thirdBlock
      .locator(BLOCK_GROUP_SELECTOR)
      .waitFor({ state: "detached" });
    const firstBlock = page.locator(BLOCK_SELECTOR).nth(0);
    const firstBlockChildren = await firstBlock.locator(BLOCK_SELECTOR).count();
    expect(firstBlockChildren).toBe(1);
  });
  test("Should be able to create complex documents that match snapshots", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h1");
    await page.keyboard.type("This is a h1");
    await executeSlashCommand(page, "h2");
    await page.keyboard.type("This is a h2");
    await page.keyboard.press("Enter", { delay: TYPE_DELAY });
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await executeSlashCommand(page, "h3");
    await page.keyboard.type("This is a h3");
    await executeSlashCommand(page, "paragraph");
    await page.keyboard.type("This is a paragraph");
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await page.keyboard.press("ArrowUp", { delay: TYPE_DELAY });
    await executeSlashCommand(page, "numbered");
    await page.keyboard.type("This is");
    await page.keyboard.press("Enter", { delay: TYPE_DELAY });
    await page.keyboard.type("a numbered list");
    await executeSlashCommand(page, "bullet");
    await page.keyboard.type("And this is a bullet list");
    await page.waitForTimeout(1000);
    // Compare doc object snapshot
    await compareDocToSnapshot(page, "docStructureSnapshot");
    // Compare editor screenshot
    expect(await page.screenshot()).toMatchSnapshot(
      "slash_menu_end_product.png"
    );
  });
});
