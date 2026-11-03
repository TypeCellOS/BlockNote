import { readOnlyLinkDocument } from "./fixtures.js";
import { navigateDefaultSchemaDocument, focusReadOnlyLink } from "./helpers.js";
import { test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import { checkAriaSnapshot, openEditor } from "@root/tests/a11y/helpers.js";

test("default schema: arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocument();
  await checkAriaSnapshot(page.getByRole("textbox"), "default schema");
});

test("read-only editor: Tab reaches inline links and leaves the editor", async () => {
  await openEditor(readOnlyLinkDocument, { editable: false });
  await focusReadOnlyLink();
  await checkAriaSnapshot(
    page.getByRole("main").getByRole("document"),
    "read-only editor",
  );
});
