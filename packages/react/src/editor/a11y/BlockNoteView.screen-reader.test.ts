import { afterEach, expect, test } from "vite-plus/test";
import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import {
  cleanup,
  nextReader,
  openEditor,
  saveTranscript,
} from "@root/tests/a11y/helpers.js";
import { navigateDefaultSchemaDocument } from "./helpers.js";

afterEach(saveTranscript);

// TODO: Enable once navigation announces block types and document structure.
test.skip("default schema: editable and read-only document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocument();
  // Keep separate editable and read-only transcripts in the same schema test.
  await saveTranscript();
  await cleanup();

  await openEditor(defaultSchemaDocument, { editable: false });
  let reachedEnd = false;
  for (let step = 0; step < 200 && !reachedEnd; step++) {
    reachedEnd = (await nextReader()).includes("End of document");
  }
  expect(reachedEnd, "Reader reaches the end of the read-only document").toBe(
    true,
  );
  // Review list counts, item positions, nested lists and list boundaries when
  // enabling this test and accepting its transcripts.
});

test.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
