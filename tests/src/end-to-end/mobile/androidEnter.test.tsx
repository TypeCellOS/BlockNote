import App from "@examples/01-basic/testing/src/App";
import { describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { commands, userEvent } from "../../utils/context.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import type { ImeCompositionCommand } from "../../utils/imeComposition.js";

const browserCommands = commands as typeof commands & {
  imeComposition: ImeCompositionCommand;
};

// Runs in the "android" browser instance (Android UA + touch emulation at
// context level, see vite.config.browser.ts), which makes prosemirror-view take
// its Android code path: Enter keydowns are ignored and the browser's native
// split is read back from the DOM. Both tests pin that read; they went red
// while BlockNote's node views filtered the split's mutation out (#2912 /
// #3001). Known gap, deliberately left alone as a rare pattern: Enter on a
// selection across blocks is a no-op on Android, because prosemirror-view's
// keypress handler cancels the browser default for cross-parent selections
// without doing anything (seen with Gboard on a Fairphone 5).
describe("Enter on Android", () => {
  test("keyboard-delivered Enter (keydown + keypress) splits the block", async () => {
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

  // The IME route: Chromium's commit path delivers a newline as a trusted
  // `beforeinput: insertText` with `data: "\n"` and no keypress (a keyboard
  // committing Enter through `commitText("\n")`); its default action is the
  // paragraph split prosemirror-view reads back. Driven through the real IME
  // pipeline over CDP.
  test.skipIf(!/android/i.test(navigator.userAgent))(
    "IME-committed newline (insertText) splits the block",
    async () => {
      await render(<App />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await userEvent.keyboard("Commit line");
      const blocksBefore = document.querySelectorAll(
        BLOCK_CONTAINER_SELECTOR,
      ).length;

      await browserCommands.imeComposition([{ type: "commit", text: "\n" }]);

      await vi.waitFor(() => {
        const blocks = document.querySelectorAll(
          BLOCK_CONTAINER_SELECTOR,
        ).length;
        if (blocks !== blocksBefore + 1) {
          throw new Error(
            `committed newline did not split (blocks ${blocksBefore} -> ${blocks})`,
          );
        }
      });
      expect(document.querySelector(EDITOR_SELECTOR)!.textContent).toBe(
        "Commit line",
      );
    },
  );
});
