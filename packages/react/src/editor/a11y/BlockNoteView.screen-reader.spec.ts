import { afterEach, test } from "vite-plus/test";
import { defaultSchemaDocument } from "../../../../../tests/a11y/documents.js";
import {
  openEditor,
  saveTranscript,
} from "../../../../../tests/a11y/helpers.js";
import { navigateDefaultSchemaDocument } from "./helpers.js";

afterEach(saveTranscript);

test("default schema: arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocument();
});

test.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
