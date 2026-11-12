import { commands } from "@root/tests/src/utils/context.js";
import { page } from "vite-plus/test/browser";
import { afterEach, expect, test } from "vite-plus/test";
import {
  renderTestEditor,
  navigateDefaultSchemaDocument,
  defaultSchemaDocument,
} from "./BlockNoteView.browser.test.js";

afterEach(async () => {
  try {
    const transcript = await commands.readTranscript();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatchSnapshot();
  } finally {
    await commands.stopReader();
  }
});

// Navigation announcements omit block types, document structure, and a lot of other markup.
test.skip("default schema: arrow-key document navigation", async () => {
  await renderTestEditor(defaultSchemaDocument);
  await commands.startReader(
    page.getByRole("button", { name: "Before editor", exact: true }).selector,
  );
  await navigateDefaultSchemaDocument();
});

// Keyboard whole-block selection is not implemented, so its announcements cannot be tested yet.
test.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
