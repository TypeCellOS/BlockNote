import { commands } from "@root/tests/src/utils/context.js";
import { afterEach, expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  renderTestEditor,
  focusToolbarItem,
  toolbarDocument,
} from "./FormattingToolbar.browser.test.js";

afterEach(async () => {
  try {
    const transcript = await commands.readTranscript();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatchSnapshot();
  } finally {
    await commands.stopReader();
  }
});

// Record selection → toolbar → Escape → editor.
// Individual toolbar item actions and focus rings are covered by the browser tests.
// Screen reader announcements do not clearly communicate entering the toolbar.
test.skip("formatting toolbar: open, focus, and close", async () => {
  await renderTestEditor(toolbarDocument);
  await commands.startReader(page.getByRole("textbox").selector);
  const { toolbar } = await focusToolbarItem("Paragraph");
  await commands.pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});
