import { Page } from "@playwright/test";
import { SLASH_MENU_SELECTOR } from "./const.js";

export async function openSlashMenu(page: Page) {
  await page.keyboard.press("/");
  await page.waitForSelector(SLASH_MENU_SELECTOR);
}

export async function executeSlashCommand(page: Page, command: string) {
  await openSlashMenu(page);
  await page.waitForTimeout(100);
  await page.keyboard.type(command);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
}
