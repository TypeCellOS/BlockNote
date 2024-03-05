import { Page } from "@playwright/test";
import { SLASH_MENU_SELECTOR } from "./const";

export async function openSlashMenu(page: Page) {
  await page.keyboard.type("/");
  await page.waitForSelector(SLASH_MENU_SELECTOR);
}

export async function executeSlashCommand(page: Page, command: string) {
  await openSlashMenu(page);
  await page.keyboard.type(command);
  await page.keyboard.press("Enter");
}
