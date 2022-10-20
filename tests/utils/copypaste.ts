import { Page } from "@playwright/test";
import { TYPE_DELAY } from "./const";

export async function copyPasteAll(page: Page, browserName: string) {
  const meta: string = browserName === "webkit" ? "Meta" : "Control";

  await page.keyboard.press(`${meta}+A`);
  await page.waitForTimeout(TYPE_DELAY);
  await page.keyboard.press(`${meta}+C`);
  await page.waitForTimeout(TYPE_DELAY);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(TYPE_DELAY);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(TYPE_DELAY);
  await page.keyboard.press(`${meta}+V`);
}

export async function insertParagraph(page: Page) {
  await page.keyboard.insertText("Paragraph");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function insertHeading(page: Page, headingLevel: number) {
  for (let i = 0; i < headingLevel; i++) {
    await page.keyboard.press("#", { delay: TYPE_DELAY });
  }

  await page.keyboard.press(" ", { delay: TYPE_DELAY });
  await page.keyboard.insertText("Heading");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function startList(page: Page, ordered: boolean) {
  if (ordered) {
    await page.keyboard.press("1", { delay: TYPE_DELAY });
    await page.keyboard.press(".", { delay: TYPE_DELAY });
    await page.keyboard.press(" ", { delay: TYPE_DELAY });
  } else {
    await page.keyboard.press("-", { delay: TYPE_DELAY });
    await page.keyboard.press(" ", { delay: TYPE_DELAY });
  }
}

export async function insertListItems(page: Page) {
  await page.keyboard.insertText("List Item 1");
  await page.keyboard.press("Enter", { delay: TYPE_DELAY });
  await page.keyboard.insertText("List Item 2");
  await page.keyboard.press("Enter", { delay: TYPE_DELAY });
  await page.keyboard.insertText("List Item 3");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}

export async function insertNestedListItems(page: Page) {
  await page.keyboard.insertText("List Item 1");
  await page.keyboard.press("Enter", { delay: TYPE_DELAY });
  await page.keyboard.press("Tab", { delay: TYPE_DELAY });
  await page.keyboard.insertText("List Item 2");
  await page.keyboard.press("Enter", { delay: TYPE_DELAY });
  await page.keyboard.press("Tab", { delay: TYPE_DELAY });
  await page.keyboard.insertText("List Item 3");
  await page.keyboard.press("ArrowDown", { delay: TYPE_DELAY });
}
