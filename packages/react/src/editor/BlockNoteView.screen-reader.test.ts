import { expect } from "vite-plus/test";
import {
  renderTestEditor,
  navigateDefaultSchemaDocument,
  defaultSchemaDocument,
} from "./BlockNoteView.browser.test.js";

// Navigation announcements omit block types, document structure, and a lot of other markup.
it.skip("default schema: arrow-key document navigation", async ({
  setupScreenReader,
  page,
}) => {
  await renderTestEditor(defaultSchemaDocument);
  const { getTranscript, pressKey } = await setupScreenReader(
    page.getByRole("button", { name: "Before editor", exact: true }),
  );
  await navigateDefaultSchemaDocument(pressKey);
  const transcript = await getTranscript();
  expect(transcript.length).toBeGreaterThan(0);
  expect(transcript).toMatchSnapshot();
});

// Keyboard whole-block selection is not implemented, so its announcements cannot be tested yet.
it.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
