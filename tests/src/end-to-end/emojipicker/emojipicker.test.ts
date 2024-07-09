import { test } from "../../setup/setupScript";
import { BASE_URL, EMOJI_PICKER_SELECTOR } from "../../utils/const";
import { focusOnEditor, waitForTextInEditor } from "../../utils/editor";
import { executeEmojiCommand, openEmojiPicker } from "../../utils/emojipicker";
import { executeSlashCommand } from "../../utils/slashmenu";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Emoji Picker Functionality", () => {
  test("should show emoji picker when : is typed", async ({ page }) => {
    await focusOnEditor(page);
    await openEmojiPicker(page);
  });
  test("Should be able to insert emoji", async ({ page }) => {
    await focusOnEditor(page);
    await executeEmojiCommand(page, "smile");
    await waitForTextInEditor(page, "😄 ");
  });
  test("Should be able to open emoji picker from slash menu", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "emoji");
    await page.waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("Should be able to insert emoji after slash command", async ({
    page,
  }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "emoji");
    await page.waitForSelector(EMOJI_PICKER_SELECTOR);
    await page.keyboard.type("smile");
    await page.keyboard.press("Enter");
    await page.pause();
    await waitForTextInEditor(page, "😄 ");
  });
});
