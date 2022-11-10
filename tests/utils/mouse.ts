import { Locator, Page } from "@playwright/test";
import { DRAG_HANDLE } from "./const";

async function getElementLeftCoords(page: Page, element: Locator) {
  const boundingBox = await element.boundingBox();
  const centerY = boundingBox.y + boundingBox.height / 2;

  return { x: boundingBox.x + 1, y: centerY };
}

async function getElementRightCoords(page: Page, element: Locator) {
  const boundingBox = await element.boundingBox();
  const centerY = boundingBox.y + boundingBox.height / 2;

  return { x: boundingBox.x + boundingBox.width - 1, y: centerY };
}

export async function moveMouseOverElement(page: Page, element: Locator) {
  const boundingBox = await element.boundingBox();
  const coords = { x: boundingBox.x, y: boundingBox.y };
  await page.mouse.move(coords.x, coords.y, { steps: 5 });
}

export async function dragAndDropBlock(
  page: Page,
  dragTarget: Locator,
  dropTarget: Locator,
  dropAbove: boolean
) {
  await moveMouseOverElement(page, dragTarget);

  await page.waitForSelector(DRAG_HANDLE);
  const dragHandle = await page.locator(DRAG_HANDLE);
  await moveMouseOverElement(page, dragHandle);
  await page.mouse.down();

  const dropTargetCoords = dropAbove
    ? await getElementLeftCoords(page, dropTarget)
    : await getElementRightCoords(page, dropTarget);
  await page.mouse.move(dropTargetCoords.x, dropTargetCoords.y, { steps: 5 });
  await page.mouse.up();
}
