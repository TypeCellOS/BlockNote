import { afterEach, expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  openEditor,
  pressKey,
  saveTranscript,
} from "@root/tests/a11y/helpers.js";
import {
  focusToolbarItem,
  toolbarDocument,
} from "./FormattingToolbar.browser.test.js";

afterEach(saveTranscript);

// Record selection → toolbar → Escape → editor.
// Individual toolbar item actions and focus rings are covered by the browser tests.
// Screen reader announcements do not clearly communicate entering the toolbar.
test.skip("formatting toolbar: open, focus, and close", async () => {
  await openEditor(toolbarDocument);
  const { toolbar } = await focusToolbarItem("Paragraph");
  await pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});
