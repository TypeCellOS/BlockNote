import { test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { checkAriaSnapshot, openEditor } from "@root/tests/a11y/helpers.js";
import { mergedTableDocument } from "./fixtures.js";

test("merged table cells preserve row and column header roles", async () => {
  await openEditor(mergedTableDocument);
  await checkAriaSnapshot(page.getByRole("textbox"), "merged table");
});
