import { Page } from "@playwright/test";
import { EMOJI_PICKER_SELECTOR } from "./const.js";

export async function openEmojiPicker(page: Page) {
  await page.keyboard.press(":");
}

export async function executeEmojiCommand(page: Page, command: string) {
  await openEmojiPicker(page);
  await page.waitForTimeout(100);
  await page.keyboard.type(command);
  await page.waitForSelector(EMOJI_PICKER_SELECTOR);
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
}
