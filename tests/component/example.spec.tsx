import { test, expect } from "@playwright/experimental-ct-react";
import { EDITOR_SELECTOR } from "../utils/const";
import Editor from "../utils/components/Editor";
import { focusOnEditor } from "../utils/editor";
import { executeSlashCommand } from "../utils/slashmenu";

test("basic editor", async ({ mount, page }) => {
  await mount(<Editor blockTypes={["image"]} />);

  await page.waitForSelector(EDITOR_SELECTOR);

  await expect(page.locator(EDITOR_SELECTOR)).toBeEditable();

  await focusOnEditor(page);
  await executeSlashCommand(page, "image");

  await expect(page.locator(`[data-content-type="image"]`)).toBeVisible();
});
