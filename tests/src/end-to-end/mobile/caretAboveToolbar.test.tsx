import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

/** The caret's client rect, from the DOM selection. */
function caretRect(): DOMRect {
  const selection = window.getSelection()!;
  const rect = selection.getRangeAt(0).cloneRange().getBoundingClientRect();
  if (rect.height > 0) {
    return rect;
  }
  // A collapsed caret at an empty position has no range rect — fall back to
  // the containing element.
  return (
    selection.focusNode!.parentElement as HTMLElement
  ).getBoundingClientRect();
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Caret vs. mobile toolbar", () => {
  test("typing at the bottom keeps the caret clear of the toolbar", async () => {
    await focusOnEditor();
    // "Keyboard opens" while typing.
    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    // Type enough blocks that the caret would reach the bottom of the
    // viewport. Without scroll insets + scroll room the caret ends up behind
    // the viewport-pinned toolbar (the document is scrolled to its end, and
    // the toolbar overlays its last lines).
    for (let i = 0; i < 18; i++) {
      await userEvent.keyboard(`Line ${i}{Enter}`);
    }
    await userEvent.keyboard("Final line");

    await vi.waitFor(() => {
      const toolbar = document
        .querySelector(MOBILE_TOOLBAR_SELECTOR)!
        .getBoundingClientRect();
      const caret = caretRect();
      if (caret.bottom > toolbar.top) {
        throw new Error(
          `Caret (bottom=${Math.round(caret.bottom)}) is occluded by the ` +
            `toolbar (top=${Math.round(toolbar.top)})`,
        );
      }
      if (caret.bottom < 0 || caret.top > window.innerHeight) {
        throw new Error("Caret scrolled out of the viewport");
      }
    });
  });
});
