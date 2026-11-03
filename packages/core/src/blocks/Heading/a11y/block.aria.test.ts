import { toggleHeadingDocument } from "./fixtures.js";
import { test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { checkAriaSnapshot, openEditor } from "@root/tests/a11y/helpers.js";
import {
  resetToggleHeading,
  focusToggleHeading,
  activateToggleHeading,
} from "./helpers.js";

test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
  resetToggleHeading();
  await openEditor(toggleHeadingDocument, { editable: false });
  await focusToggleHeading();
  const editor = page.getByRole("textbox");
  await checkAriaSnapshot(editor, "collapsed");
  await activateToggleHeading();
  await checkAriaSnapshot(editor, "expanded");
  await activateToggleHeading();
  await checkAriaSnapshot(editor, "collapsed again");
});
