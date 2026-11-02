import { toggleHeadingDocument } from "./fixtures.js";
import { openEditor } from "@root/tests/a11y/helpers.js";
import { expect, test, vi, afterEach } from "vite-plus/test";
import {
  resetToggleHeading,
  focusToggleHeading,
  activateToggleHeading,
} from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
  resetToggleHeading();
  await openEditor(toggleHeadingDocument, { editable: false });
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  await focusToggleHeading();
  await activateToggleHeading();
  expect(setItem).toHaveBeenCalledExactlyOnceWith(
    "toggle-read-only-toggle-heading",
    "true",
  );
  setItem.mockClear();
  await activateToggleHeading();
  expect(setItem).toHaveBeenCalledExactlyOnceWith(
    "toggle-read-only-toggle-heading",
    "false",
  );
});
