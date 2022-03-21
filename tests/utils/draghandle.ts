import { Page } from "@playwright/test";
import { DRAGHANDLEADD } from "./const";
import { moveMouseOverElement } from "./mouse";

export async function addBlockFromDragHandle(page: Page, blockQuery: string) {
  await page.click(DRAGHANDLEADD);
  await page.keyboard.type(blockQuery, { delay: 10 });
  await page.keyboard.press("Enter", { delay: 10 });
}

export async function hoverAndAddBlockFromDragHandle(
  page: Page,
  selector: string,
  blockQuery: string
) {
  await moveMouseOverElement(page, selector);
  await addBlockFromDragHandle(page, blockQuery);
}
