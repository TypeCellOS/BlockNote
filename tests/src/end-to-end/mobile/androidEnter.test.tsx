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
// take its Android code path: Enter keydowns are ignored there, and PM's own
// fallback — parsing the native DOM change — misparses BlockNote's nested
// block DOM and corrupts the document (TypeCellOS/BlockNote#3001: Enter
// inserting a space, doing nothing, or breaking tables). BlockNote
// intercepts both delivery routes instead (see KeyboardShortcutsExtension):
// `keypress` for hardware/synthetic keyboards, `beforeinput` for the IME.
// The tests below pin one route each.
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

  // The IME path itself: real soft keyboards deliver Enter as keyCode 229 +
  // `beforeinput: insertParagraph` with NO keypress, so the keypress
  // interception (which covers hardware/synthetic keyboards, above) never
  // runs. No automated input layer produces that exact trusted sequence — a
  // synthetic InputEvent reaches prosemirror's handleDOMEvents all the same,
  // so this pins the `beforeinput` interception the way IMEs actually invoke
  // it. (Without the interception a synthetic event simply does nothing, so
  // this fails red without the fix.)
  test.skipIf(!/android/i.test(navigator.userAgent))(
    "IME-delivered Enter (beforeinput, no keypress) splits the block",
    async () => {
      await render(<App />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await userEvent.keyboard("Ime line");
      const blocksBefore = document.querySelectorAll(
        BLOCK_CONTAINER_SELECTOR,
      ).length;

      document.querySelector(EDITOR_SELECTOR)!.dispatchEvent(
        new InputEvent("beforeinput", {
          inputType: "insertParagraph",
          bubbles: true,
          cancelable: true,
        }),
      );

      await vi.waitFor(() => {
        const blocks = document.querySelectorAll(
          BLOCK_CONTAINER_SELECTOR,
        ).length;
        if (blocks !== blocksBefore + 1) {
          throw new Error(
            `beforeinput Enter did not split (blocks ${blocksBefore} -> ${blocks})`,
          );
        }
      });
      expect(document.querySelector(EDITOR_SELECTOR)!.textContent).toBe(
        "Ime line",
      );
    },
  );

  // With a NON-EMPTY cross-block selection, an Enter keydown+keypress pair
  // (hardware or synthetic keyboard) used to be a silent no-op on Android:
  // prosemirror-view's Android keydown bail skips Enter handling, and its own
  // keypress handler then cancels the browser default for cross-parent
  // selections without doing anything. BlockNote's `handleKeyPress`
  // interception routes it through the keymap chain instead. The hole (and
  // this test) is Android-only: everywhere else the keymap already handles
  // Enter at keydown, so the keypress branch never matters — and on the
  // iOS-emulated instance the setup itself is unreliable (typing after a
  // settled Enter lands back in the previous block, a webkit-on-Linux
  // emulation artifact the real-device suite doesn't show).
  const onAndroid = /android/i.test(navigator.userAgent);
  test.skipIf(!onAndroid)(
    "Enter with a cross-block selection deletes it and splits",
    async () => {
      await render(<App />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await userEvent.keyboard("First line");
      await userEvent.keyboard("{Enter}");
      // The split can settle asynchronously (iOS path); typing must land in the
      // new block before the selection below can target both paragraphs.
      await vi.waitFor(() => {
        if (
          !Array.from(document.querySelectorAll(`${EDITOR_SELECTOR} p`)).some(
            (el) => el.textContent === "",
          )
        ) {
          throw new Error("Enter split not settled");
        }
      });
      await userEvent.keyboard("Second line");
      await vi.waitFor(() => {
        const texts = Array.from(
          document.querySelectorAll(`${EDITOR_SELECTOR} p`),
        ).map((el) => el.textContent);
        if (!texts.includes("First line") || !texts.includes("Second line")) {
          throw new Error(`paragraphs not settled: ${JSON.stringify(texts)}`);
        }
      });

      // Select from mid-first-line to mid-second-line via a DOM range —
      // arrow-key selection maps goal columns differently per engine, while
      // ProseMirror syncs a programmatic range from `selectionchange` on all of
      // them. Selects "ne" + "Sec" across the block boundary.
      function textPosition(
        paragraphText: string,
        offset: number,
      ): [Text, number] {
        const paragraph = Array.from(
          document.querySelectorAll(`${EDITOR_SELECTOR} p`),
        ).find((el) => el.textContent === paragraphText);
        if (!paragraph) {
          throw new Error(
            `paragraph ${JSON.stringify(paragraphText)} not found`,
          );
        }
        const walker = document.createTreeWalker(
          paragraph,
          NodeFilter.SHOW_TEXT,
        );
        let consumed = 0;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const length = n.textContent!.length;
          if (offset <= consumed + length) {
            return [n as Text, offset - consumed];
          }
          consumed += length;
        }
        throw new Error(
          `offset ${offset} beyond ${JSON.stringify(paragraphText)}`,
        );
      }
      await vi.waitFor(() => {
        const range = document.createRange();
        range.setStart(...textPosition("First line", "First li".length));
        range.setEnd(...textPosition("Second line", "Sec".length));
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        if (selection.isCollapsed) {
          throw new Error("cross-block selection did not apply");
        }
      });

      await userEvent.keyboard("{Enter}");

      // The selected span ("ne" + "Sec") is deleted and the remainder split
      // across two blocks: "First li" + "ond line".
      await vi.waitFor(() => {
        const text = document.querySelector(EDITOR_SELECTOR)!.textContent!;
        if (text.includes("First line")) {
          throw new Error(`Enter did not delete the selection: ${text}`);
        }
        if (!text.includes("First li") || !text.includes("ond line")) {
          throw new Error(`unexpected text after Enter: ${text}`);
        }
      });
      expect(
        document.querySelectorAll(BLOCK_CONTAINER_SELECTOR).length,
      ).toBeGreaterThanOrEqual(2);
    },
  );
});
