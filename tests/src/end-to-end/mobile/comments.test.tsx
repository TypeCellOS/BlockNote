import App from "@examples/07-collaboration/09-comments-testing/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

/**
 * The comment composer is a full nested BlockNoteView inside a floating card,
 * so it mounts its own mobile formatting toolbar. Exactly one mobile toolbar
 * may be on screen at a time — the one belonging to the editor that holds
 * focus — and it must be pinned to the bottom of the visual viewport (the
 * floating card must not become the containing block for the nested toolbar's
 * `position: fixed`).
 */
function expectSingleToolbarAtViewportBottom() {
  return vi.waitFor(() => {
    const toolbars = Array.from(
      document.querySelectorAll(MOBILE_TOOLBAR_SELECTOR),
    );
    if (toolbars.length !== 1) {
      throw new Error(
        `Expected exactly 1 mobile toolbar, found ${toolbars.length}`,
      );
    }
    const rect = toolbars[0].getBoundingClientRect();
    if (rect.height === 0) {
      throw new Error("Mobile toolbar has no size");
    }
    if (Math.abs(rect.bottom - window.innerHeight) > 1 || rect.top < 0) {
      throw new Error(
        `Mobile toolbar not pinned to viewport bottom: top=${rect.top}, ` +
          `bottom=${rect.bottom}, viewport height=${window.innerHeight}`,
      );
    }
    return toolbars[0];
  });
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

describe("Comments on mobile", () => {
  test("composing a comment hands the toolbar to the composer and back", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Comment target here");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    // "Keyboard opens": the main editor's mobile toolbar appears.
    await page.viewport(393, 427);
    const mainToolbar = await expectSingleToolbarAtViewportBottom();

    const commentButton = Array.from(
      mainToolbar.querySelectorAll<HTMLElement>("button"),
    ).find((button) =>
      /comment/i.test(button.getAttribute("aria-label") ?? ""),
    );
    expect(commentButton).toBeDefined();
    await userEvent.click(commentButton!);

    // The floating composer opens with its own (nested) editor focused, so
    // typing goes into the comment.
    await vi.waitFor(() => {
      const active = document.activeElement;
      if (!active?.closest(".bn-comment-editor")) {
        throw new Error("comment composer did not receive focus");
      }
    });
    await userEvent.keyboard("A mobile comment");
    await vi.waitFor(() => {
      const composer = document.querySelector(".bn-comment-editor");
      if (!composer?.textContent?.includes("A mobile comment")) {
        throw new Error("typing did not land in the comment composer");
      }
    });
    expect(document.querySelector(EDITOR_SELECTOR)!.textContent).not.toContain(
      "A mobile comment",
    );

    // The composer's own toolbar (with comment formatting controls) takes the
    // main toolbar's place — one toolbar, correctly pinned.
    const composerToolbar = await expectSingleToolbarAtViewportBottom();
    expect(composerToolbar.closest(".bn-comment-editor")).not.toBeNull();

    const saveButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) =>
      /save/i.test(
        (button.getAttribute("aria-label") ?? "") + button.textContent,
      ),
    );
    expect(saveButton).toBeDefined();
    await userEvent.click(saveButton!);

    // Saving creates the thread and hands focus (and the toolbar) back to the
    // main editor.
    await waitForSelector(`${EDITOR_SELECTOR} .bn-thread-mark`);
    await vi.waitFor(() => {
      if (document.querySelector(".bn-comment-editor")) {
        throw new Error("composer still open after saving");
      }
    });
    const restoredToolbar = await expectSingleToolbarAtViewportBottom();
    expect(restoredToolbar.closest(".bn-comment-editor")).toBeNull();
  });
});
