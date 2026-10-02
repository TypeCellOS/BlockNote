import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { useCreateBlockNote } from "@blocknote/react";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { browserName, MOD, userEvent } from "../../utils/context.js";
import { mouseSequence } from "../../utils/mouse.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    mathBlock: createReactMathBlockSpec(),
    diagram: createReactDiagramBlockSpec(),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

type Kind = "mathBlock" | "diagram" | "math";

function ErrorSelectionApp({ kind }: { kind: Kind }) {
  const editor = useCreateBlockNote({
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
              content: kind === "diagram" ? "graph TD\nA -->" : "\\badcommand",
            },
          ],
  });
  return (
    <>
      <BlockNoteView editor={editor} />
      <textarea aria-label="Paste error text" />
    </>
  );
}

test.each<Kind>(["mathBlock", "diagram", "math"])(
  "selecting and copying %s error text preserves the popup and source editing",
  async (kind) => {
    await render(<ErrorSelectionApp kind={kind} />);
    await userEvent.click(
      document.querySelector<HTMLElement>(".bn-preview-container")!,
    );
    const error = document.querySelector<HTMLElement>(
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
    const text = error.firstChild!;
    const word = (text.textContent ?? "").match(/\S+/)![0];
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, word.length);
    const rect = range.getBoundingClientRect();
    await mouseSequence([
      { type: "move", x: rect.left, y: rect.top + rect.height / 2 },
      { type: "down" },
      { type: "move", x: rect.right, y: rect.top + rect.height / 2, steps: 10 },
      { type: "up" },
    ]);
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(error);
      expect(window.getSelection()?.toString()).toBe(word);
      expect(
        error
          .closest(".bn-preview-with-source-popup")
          ?.getAttribute("data-open"),
      ).toBe("true");
    });
    // Playwright WebKit does not support the native clipboard round trip.
    // Still exercise selection, focus recovery, and dismissal in that browser.
    if (browserName !== "webkit") {
      await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`);
    }

    // Focus leaving the error must close the popup.
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    await userEvent.click(textarea);
    expect(
      error.closest(".bn-preview-with-source-popup")?.getAttribute("data-open"),
    ).toBe("false");
    await userEvent.click(
      document.querySelector<HTMLElement>(".bn-preview-container")!,
    );
    await userEvent.click(error);
    expect(document.activeElement).toBe(error);

    // Moving directly back from the error to the source must keep it editable.
    const source = document.querySelector<HTMLElement>(
      ".bn-source-block-popup code",
    )!;
    await userEvent.click(source);
    const originalSource = source.textContent;
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
    if (browserName !== "webkit") {
      await userEvent.keyboard(`{${MOD}>}v{/${MOD}}`);
      expect(textarea.value).toBe(word);
    }
    expect(
      error.closest(".bn-preview-with-source-popup")?.getAttribute("data-open"),
    ).toBe("false");
  },
);
