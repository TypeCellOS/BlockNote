import { Page } from "@playwright/test";
import { DRAG_HANDLE_ADD_SELECTOR, DRAG_HANDLE_SELECTOR } from "./const";
import { moveMouseOverElement } from "./mouse";

export async function addBlockFromDragHandle(page: Page, blockQuery: string) {
  await page.click(DRAG_HANDLE_ADD_SELECTOR);
  await page.keyboard.type(blockQuery, { delay: 10 });
  await page.keyboard.press("Enter", { delay: 10 });
}

export async function hoverAndAddBlockFromDragHandle(
  page: Page,
  selector: string,
  blockQuery: string
) {
  const element = await page.locator(selector);
  await moveMouseOverElement(page, element);
  await addBlockFromDragHandle(page, blockQuery);
}

export async function getDragHandleYCoord(page: Page, selector: string) {
  const element = await page.locator(selector);
  await moveMouseOverElement(page, element);
  await page.waitForSelector(DRAG_HANDLE_SELECTOR);
  const boundingBox = (await page.locator(DRAG_HANDLE_SELECTOR).boundingBox())!;
  return boundingBox.y;
}
