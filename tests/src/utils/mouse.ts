import { Locator, Page } from "@playwright/test";
import { DRAG_HANDLE_SELECTOR } from "./const";

async function getElementLeftCoords(_page: Page, element: Locator) {
  const boundingBox = (await element.boundingBox())!;
  const centerY = boundingBox.y + boundingBox.height / 2;

  return { x: boundingBox.x + 1, y: centerY };
}

async function getElementRightCoords(_page: Page, element: Locator) {
  const boundingBox = (await element.boundingBox())!;
  const centerY = boundingBox.y + boundingBox.height / 2;

  return { x: boundingBox.x + boundingBox.width - 1, y: centerY };
}

async function getElementCenterCoords(_page: Page, element: Locator) {
  const boundingBox = (await element.boundingBox())!;
  const centerX = boundingBox.x + boundingBox.width / 2;
  const centerY = boundingBox.y + boundingBox.height / 2;

  return { x: centerX, y: centerY };
}

export async function moveMouseOverElement(page: Page, element: Locator) {
  const boundingBox = (await element.boundingBox())!;
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

  await page.waitForSelector(DRAG_HANDLE_SELECTOR);
  const dragHandle = await page.locator(DRAG_HANDLE_SELECTOR);
  const dragHandleCenterCoords = await getElementCenterCoords(page, dragHandle);
  await page.mouse.move(dragHandleCenterCoords.x, dragHandleCenterCoords.y, {
    steps: 5,
  });
  await page.mouse.down();

  const dropTargetCoords = dropAbove
    ? await getElementLeftCoords(page, dropTarget)
    : await getElementRightCoords(page, dropTarget);
  await page.mouse.move(dropTargetCoords.x, dropTargetCoords.y, { steps: 5 });
  await page.mouse.up();
}
