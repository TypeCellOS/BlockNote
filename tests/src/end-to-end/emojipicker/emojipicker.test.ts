import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASE_URL, EMOJI_PICKER_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForTextInEditor } from "../../utils/editor.js";
import {
  executeEmojiCommand,
  openEmojiPicker,
} from "../../utils/emojipicker.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Emoji Picker Functionality", () => {
  test("should not show emoji picker when : is typed", async ({ page }) => {
    await focusOnEditor(page);
    await openEmojiPicker(page);
    await expect(page.locator(EMOJI_PICKER_SELECTOR)).toHaveCount(0);
  });
  test("should show emoji picker when : and query is typed", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await openEmojiPicker(page);
    await page.keyboard.type("sm");
    await page.waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("Should be able to insert emoji", async ({ page }) => {
    await focusOnEditor(page);
    await executeEmojiCommand(page, "sm");
    await page.pause();
    await waitForTextInEditor(page, "🛩️ ");
  });
  test("Should be able to open emoji picker from slash menu", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "emoji");
    await page.keyboard.type("sm");
    await page.waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("Should be able to insert emoji after slash command", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "emoji");
    await page.keyboard.type("sm");
    await page.waitForSelector(EMOJI_PICKER_SELECTOR);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await waitForTextInEditor(page, "🛩️ ");
  });
});
