import { Page } from "@playwright/test";
import { TYPE_DELAY } from "./const";

export async function copyPasteAll(page: Page) {
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Control+C");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+V");
}

export async function insertParagraph(page: Page) {
  await page.keyboard.type("Paragraph");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function insertHeading(page: Page, headingLevel: number) {
  for (let i = 0; i < headingLevel; i++) {
    await page.keyboard.press("#");
  }

  await page.keyboard.press(" ");
  await page.keyboard.type("Heading");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function startList(page: Page, ordered: boolean) {
  if (ordered) {
    await page.keyboard.press("1");
    await page.keyboard.press(".");
    await page.keyboard.press(" ");
  } else {
    await page.keyboard.press("-");
    await page.keyboard.press(" ");
  }
}

export async function insertListItems(page: Page) {
  await page.keyboard.type("List Item 1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("List Item 2");
  await page.keyboard.press("Enter");
  await page.keyboard.type("List Item 3");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function insertNestedListItems(page: Page) {
  await page.keyboard.type("List Item 1");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("List Item 2");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("List Item 3");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}
