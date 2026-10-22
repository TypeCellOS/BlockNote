import { afterEach, test } from "vite-plus/test";
import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import { openEditor, saveTranscript } from "@root/tests/a11y/helpers.js";
import { navigateDefaultSchemaDocument } from "./helpers.js";

afterEach(saveTranscript);

// Navigation announcements omit block types, document structure, and a lot of other markup.
test.skip("default schema: arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocument();
});

// Keyboard whole-block selection is not implemented, so its announcements cannot be tested yet.
test.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
