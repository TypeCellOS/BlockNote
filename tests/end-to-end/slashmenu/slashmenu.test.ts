import { test, expect, Page, ElementHandle } from "@playwright/test";
import { BASE_URL } from "../../utils/const";

const EDITOR_SELECTOR = `[data-test="editor"]`;
const SLASH_MENU_SELECTOR = `[data-tippy-root]`;
const H_ONE_BLOCK_SELECTOR = `[data-headingtype="1"] > [data-headingtype="1"]`;
const H_TWO_BLOCK_SELECTOR = `[data-headingtype="2"] > [data-headingtype="2"]`;
const H_THREE_BLOCK_SELECTOR = `[data-headingtype="3"] > [data-headingtype="3"]`;
const BLOCK_GROUP_SELECTOR = `[class*="blockGroup"]`;

async function openEditor(page: Page) {
  const editor = await page.waitForSelector(EDITOR_SELECTOR);
  await page.click(EDITOR_SELECTOR);
  return editor;
}

async function openSlashMenu(page: Page) {
  const editor = await page.waitForSelector(EDITOR_SELECTOR);
  await page.click(EDITOR_SELECTOR);
  await page.type(EDITOR_SELECTOR, "/");
  await page.waitForSelector(SLASH_MENU_SELECTOR);
  return editor;
}

async function findBlock(
  editor: ElementHandle<SVGElement | HTMLElement>,
  selector
) {
  return await editor.waitForSelector(selector);
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check SlashMenu Functionality", () => {
  test("should show slash menu when / is typed", async ({ page }) => {
    await openSlashMenu(page);
  });
  test("Should be able to create h1", async ({ page }) => {
    const editor = await openSlashMenu(page);
    await page.keyboard.type("h1");
    await page.keyboard.press("Enter");
    await findBlock(editor, H_ONE_BLOCK_SELECTOR);
  });
  test("Should be able to create h2", async ({ page }) => {
    const editor = await openSlashMenu(page);
    await page.keyboard.type("h2");
    await page.keyboard.press("Enter");
    await findBlock(editor, H_TWO_BLOCK_SELECTOR);
  });
  test("Should be able to create h3", async ({ page }) => {
    const editor = await openSlashMenu(page);
    await page.keyboard.type("h3");
    await page.keyboard.press("Enter");
    await findBlock(editor, H_THREE_BLOCK_SELECTOR);
  });
  //   test("Should be able to create paragraph", async ({ page }) => {
  //     const editor = await openEditor(page);
  //     await page.keyboard.type("text");
  //     await openSlashMenu(page);

  //   });
  test("Should add block as sibling of current block if block has content when selecting block from slash menu", async ({
    page,
  }) => {
    let editor = await openSlashMenu(page);
    await page.keyboard.type("h1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("text");
    await page.waitForTimeout(1000);
    await openSlashMenu(page);
    await page.keyboard.type("h2");
    await page.keyboard.press("Enter");
    await page.keyboard.type("text");
    await page.waitForTimeout(1000);
    const blockGroupCount = (await page.$$(BLOCK_GROUP_SELECTOR)).length;
    expect(blockGroupCount).toEqual(1);
  });
});
