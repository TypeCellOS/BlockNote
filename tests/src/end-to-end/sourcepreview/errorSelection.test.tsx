import { BlockNoteSchema } from "@blocknote/core";
import interStyles from "@blocknote/core/fonts/inter.css?inline";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { expect, vi } from "vite-plus/test";

import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import { dispatchClipboardEvent } from "../../utils/clipboardEvent.js";
import { userEvent } from "../../utils/context.js";
import { mouseSequence } from "../../utils/mouse.js";

useBrowserSuiteStyles(interStyles);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    mathBlock: createReactMathBlockSpec(),
    diagram: createReactDiagramBlockSpec(),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

type Kind = "mathBlock" | "diagram" | "math";

it.for<Kind>(["mathBlock", "diagram", "math"])(
  "selecting and copying %s error text preserves the popup and source editing",
  async (kind, { setupEditor }) => {
    const { rootNode } = await setupEditor({
      schema,
      initialContent:
        kind === "math"
          ? [
              {
                type: "paragraph",
                content: [{ type: "math", content: "\\badcommand" }],
              },
            ]
          : [
              {
                type: kind,
                content:
                  kind === "diagram" ? "graph TD\nA -->" : "\\badcommand",
              },
            ],
      outside: ({ children }) => (
        <>
          {children}
          <textarea aria-label="Paste error text" />
        </>
      ),
    });
    await userEvent.click(
      rootNode.querySelector<HTMLElement>(".bn-preview-container")!,
    );
    const error = rootNode.querySelector<HTMLElement>(
      ".bn-code-block-source-error",
    )!;
    await vi.waitFor(() => {
      expect(error.textContent?.length).toBeGreaterThan(0);
      expect(
        error
          .closest(".bn-preview-with-source-popup")
          ?.getAttribute("data-open"),
      ).toBe("true");
    });

    // Drag across the first word using real mouse events. A DOM-only selection
    // wouldn't reproduce Firefox resetting the selection after mouseup (#3138).
    await userEvent.hover(error);
    await document.fonts.ready;
    const text = error.firstChild!;
    const word = (text.textContent ?? "").match(/\S+/)![0];
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, word.length);
    const rect = range.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const readErrorSelection = () => {
      const selection = window.getSelection();
      if (
        selection?.anchorNode &&
        selection.focusNode &&
        error.contains(selection.anchorNode) &&
        error.contains(selection.focusNode)
      ) {
        return selection.toString();
      }
      return "";
    };
    let selectedText: string;
    try {
      await mouseSequence([
        { type: "move", x: rect.left, y },
        { type: "down" },
        { type: "move", x: rect.right, y, steps: 10 },
      ]);
      // The regression is losing the native selection on mouseup, not which
      // glyph the browser hits at the last pointer coordinate.
      await expect.poll(readErrorSelection).not.toBe("");
      selectedText = readErrorSelection();
      expect(word.startsWith(selectedText)).toBe(true);
    } finally {
      await mouseSequence([{ type: "up" }]);
    }
    await vi.waitFor(() => {
      expect(readErrorSelection()).toBe(selectedText);
      expect(
        error
          .closest(".bn-preview-with-source-popup")
          ?.getAttribute("data-open"),
      ).toBe("true");
    });
    const source = rootNode.querySelector<HTMLElement>(
      ".bn-source-block-popup code",
    )!;
    const originalSource = source.textContent;
    // The editor still has focus, but its shortcuts must not edit or submit
    // the source while the native selection belongs to the error text.
    await userEvent.keyboard("{Enter}{Backspace}");
    expect(source.textContent).toBe(originalSource);
    expect(
      error.closest(".bn-preview-with-source-popup")?.getAttribute("data-open"),
    ).toBe("true");
    // The editor must leave copying this non-editable selection to the browser.
    // Synthetic events exercise that boundary without writing to the OS.
    const clipboard = new DataTransfer();
    expect(
      dispatchClipboardEvent(error, "copy", clipboard).defaultPrevented,
    ).toBe(false);
    expect(clipboard.types).toEqual([]);
    expect(readErrorSelection()).toBe(selectedText);
    clipboard.setData("text/plain", selectedText);
    dispatchClipboardEvent(error, "paste", clipboard);
    expect(
      dispatchClipboardEvent(error, "cut", clipboard).defaultPrevented,
    ).toBe(false);
    expect(source.textContent).toBe(originalSource);

    // Focus leaving the editor must close the popup.
    const textarea = rootNode.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Paste error text"]',
    )!;
    await userEvent.click(textarea);
    expect(
      error.closest(".bn-preview-with-source-popup")?.getAttribute("data-open"),
    ).toBe("false");
    await userEvent.click(
      rootNode.querySelector<HTMLElement>(".bn-preview-container")!,
    );
    await userEvent.click(error);

    // Moving directly back from the error to the source must keep it editable.
    await userEvent.click(source);
    await userEvent.keyboard("{End}x");
    await vi.waitFor(() =>
      expect(source.textContent).toBe(originalSource + "x"),
    );
    expect(
      source
        .closest(".bn-preview-with-source-popup")
        ?.getAttribute("data-open"),
    ).toBe("true");

    await userEvent.click(textarea);
    expect(
      error.closest(".bn-preview-with-source-popup")?.getAttribute("data-open"),
    ).toBe("false");
  },
);
