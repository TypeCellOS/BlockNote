import interStyles from "@blocknote/core/fonts/inter.css?inline";
import NonEditableApp from "@examples/06-custom-schema/08-non-editable-block/src/App";
import { describe, expect } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import {
  DOC_TRAILING_BLOCK_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { browserName, MOD, userEvent } from "../../utils/context.js";
import { waitForWithin } from "../../utils/copypaste.js";

useBrowserSuiteStyles(interStyles);

describe("Check Copy/Paste From Non-Editable Block", () => {
  // Keep one trusted clipboard round trip for the browser default action.
  it.skipIf(browserName !== "chromium")(
    "Should be able to copy/paste text from a non-editable block",
    async ({ onTestFinished }) => {
      // Use the example's actual non-editable block DOM as the copy source.
      const { container } = await render(<NonEditableApp />);
      const editor = await waitForWithin(container, EDITOR_SELECTOR);
      function blocks() {
        return [...editor.querySelectorAll<HTMLElement>(".bn-block-content")];
      }
      function ids() {
        return blocks().map((block) =>
          block.closest(".bn-block")?.getAttribute("data-id"),
        );
      }
      const originalIds = ids();
      const source = await waitForWithin(
        editor,
        '[data-content-type="nonEditable"] p',
      );
      // The copy source is non-editable. Leave editing focus before selecting
      // its DOM text so the editor doesn't restore its editable caret.
      editor.blur();
      // Selection is setup, not the behavior under test. A geometric drag can
      // select a whole block depending on native multi-click state and fonts.
      const selectedText = "This is ";
      const text = source.firstChild;
      if (!(text instanceof Text)) {
        throw new Error("The non-editable copy source must contain text.");
      }
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, selectedText.length);
      const selection = document.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      await expect
        .poll(() => {
          const selection = document.getSelection();
          return {
            text: selection?.toString(),
            inSource:
              source.contains(selection?.anchorNode ?? null) &&
              source.contains(selection?.focusNode ?? null),
          };
        })
        .toEqual({ text: selectedText, inSource: true });

      const events = new AbortController();
      onTestFinished(() => events.abort());
      const options = { capture: true, once: true, signal: events.signal };
      let trustedCopy = false;
      document.addEventListener(
        "copy",
        (event) => {
          trustedCopy = event.isTrusted;
        },
        options,
      );
      await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`);
      expect(trustedCopy).toBe(true);

      // Click the trailing block to create a new empty paragraph and focus
      // the editor there.
      await userEvent.click(
        await waitForWithin(container, DOC_TRAILING_BLOCK_SELECTOR),
      );

      // Observe the delivered clipboard without reading or writing it separately.
      let pasted: { trusted: boolean; text: string | undefined } | undefined;
      document.addEventListener(
        "paste",
        (event) => {
          pasted = {
            trusted: event.isTrusted,
            text: event.clipboardData?.getData("text/plain"),
          };
        },
        options,
      );
      await userEvent.keyboard(`{${MOD}>}v{/${MOD}}`);
      expect(pasted).toEqual({ trusted: true, text: selectedText });

      const result = blocks();
      expect(result.map((block) => block.dataset.contentType)).toEqual([
        "paragraph",
        "nonEditable",
        "paragraph",
      ]);
      expect(result.map((block) => block.textContent)).toEqual([
        "Welcome to this demo!",
        "This is a non-editable block.",
        "This is\u00a0",
      ]);
      expect(ids().slice(0, 2)).toEqual(originalIds);
      expect(new Set(ids()).size).toBe(3);
      expect(
        Array.from(result[2].querySelectorAll("[data-style-type]"), (span) => [
          span.getAttribute("data-style-type"),
          span.getAttribute("data-value"),
        ]).sort(([a], [b]) => (a ?? "").localeCompare(b ?? "")),
      ).toEqual([
        ["backgroundColor", "oklch(1 0 0)"],
        ["textColor", "oklch(0.37 0 0)"],
      ]);
    },
  );
});
