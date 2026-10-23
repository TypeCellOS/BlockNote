import { afterEach, expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  openEditor,
  pressKey,
  saveTranscript,
} from "@root/tests/a11y/helpers.js";
import { toolbarDocument, focusToolbarControl } from "./helpers.js";

afterEach(saveTranscript);

// Record selection → toolbar → block-type menu → Escape → editor.
// Individual control actions and focus rings are covered by the browser tests.
// Screen reader announcements do not clearly communicate entering the toolbar.
test.skip("formatting toolbar: Paragraph", async () => {
  await openEditor(toolbarDocument);
  const { toolbar } = await focusToolbarControl("Paragraph");
  await pressKey("Enter");
  const menu = page.getByRole("menu");
  await expect.element(menu).toBeVisible();
  await pressKey("ArrowDown");
  await expect.element(menu.getByRole("menuitem").first()).toHaveFocus();
  await pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});
