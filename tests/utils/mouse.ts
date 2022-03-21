import { Page } from "@playwright/test";

export async function moveMouseOverElement(page: Page, selector: string) {
  const pos = await page.locator(selector).boundingBox();
  await page.mouse.move(pos.x, pos.y, { steps: 5 });
}
