import App from "@examples/01-basic/testing/src/App";
import { describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";

// Runs in the "android" browser instance (Android UA + touch emulation at
// context level — see vite.config.browser.ts), which makes prosemirror-view
// take its Android code path: Enter keydowns are ignored there, and handling
// happens via the `beforeinput` (insertParagraph) the browser emits. PM's own
// fallback — parsing the native DOM split — misparses BlockNote's nested
// block DOM and corrupts the document (TypeCellOS/BlockNote#3001: Enter
// inserting a space, doing nothing, or breaking tables), so BlockNote
// intercepts the `beforeinput` instead (see KeyboardShortcutsExtension).
// This test pins that path.
describe("Enter on Android", () => {
  test("beforeinput insertParagraph splits the block", async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await userEvent.keyboard("First line");

    const blocksBefore = document.querySelectorAll(
      BLOCK_CONTAINER_SELECTOR,
    ).length;
    const textBefore = document.querySelector(EDITOR_SELECTOR)!.textContent;

    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      const blocks = document.querySelectorAll(BLOCK_CONTAINER_SELECTOR).length;
      if (blocks !== blocksBefore + 1) {
        throw new Error(
          `Enter did not split the block (blocks ${blocksBefore} -> ${blocks})`,
        );
      }
    });
    // The classic #3001 misbehavior inserts a space or mangles text instead.
    expect(document.querySelector(EDITOR_SELECTOR)!.textContent).toBe(
      textBefore,
    );

    await userEvent.keyboard("Second line");
    await vi.waitFor(() => {
      if (
        !document
          .querySelector(EDITOR_SELECTOR)!
          .textContent!.includes("Second line")
      ) {
        throw new Error("typing after Enter did not land in the new block");
      }
    });
  });
});
