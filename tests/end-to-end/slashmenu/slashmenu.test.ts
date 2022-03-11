import { test, expect, Page, ElementHandle } from "@playwright/test";
import { BASE_URL } from "../../utils/const";
import {
  BLOCK_GROUP_SELECTOR,
  BLOCK_SELECTOR,
  executeSlashCommand,
  focusOnEditor,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  openSlashMenu,
  waitForSelectorInEditor,
} from "./utils";

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
    await waitForSelectorInEditor(page, H_ONE_BLOCK_SELECTOR);
  });
  test("Should be able to create h2", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h2");
    await waitForSelectorInEditor(page, H_TWO_BLOCK_SELECTOR);
  });
  test("Should be able to create h3", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "h3");
    await waitForSelectorInEditor(page, H_THREE_BLOCK_SELECTOR);
  });
  test("Should be able to create paragraph", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "paragraph");
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
    await page.keyboard.press("Enter", { delay: 100 });
    await page.keyboard.press("Tab", { delay: 100 });
    await page.keyboard.type("B");
    await page.keyboard.press("ArrowUp", { delay: 100 });
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
    // Open slash menu and take screenshot
    await openSlashMenu(page);
    await page.waitForTimeout(5000); // Wait for slash menu to finish animation
    expect(await page.screenshot()).toMatchSnapshot(
      "slash_menu_end_product.png"
    );
  });
});
