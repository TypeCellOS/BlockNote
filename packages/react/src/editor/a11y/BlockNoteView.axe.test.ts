import { test } from "vite-plus/test";
import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import { openEditor, checkAxe } from "@root/tests/a11y/helpers.js";

test("default schema: axe", async () => {
  await openEditor(defaultSchemaDocument);
  await checkAxe();
});
