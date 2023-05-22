import { Page } from "@playwright/test";
import { PASTE_ZONE_SELECTOR, TYPE_DELAY } from "./const";
import { focusOnEditor } from "./editor";
import { showMouseCursor } from "./debug";

export async function copyPasteAll(page: Page) {
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Meta+C");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Meta+V");
}

export async function copyPasteAllExternal(page: Page) {
  await showMouseCursor(page);
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Meta+C");
  await focusOnEditor(page);

  const pasteZone = page.locator(PASTE_ZONE_SELECTOR);
  await pasteZone.click();
  await page.keyboard.press("Meta+V");

  return await pasteZone.inputValue();
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
