import App from "@examples/09-ai/01-minimal/src/App";
import { expect, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR, PARAGRAPH_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";

it("preserves the editor selection when the AI toolbar button opens the prompt (#2525)", async () => {
  await render(<App />);
  const editor = await waitForSelector(EDITOR_SELECTOR);
  const paragraph = await waitForSelector(
    `${EDITOR_SELECTOR} ${PARAGRAPH_SELECTOR} .bn-inline-content`,
  );
  const text = paragraph.firstChild;
  const selection = document.getSelection();
  if (!(text instanceof Text) || !selection) {
    throw new Error("Could not select text in the first editor paragraph");
  }

  const selectedText = "Open source software";
  await document.fonts.ready;
  editor.focus();
  // ProseMirror reconciles its selection on a timer after editor focus.
  // Drain that work before setting the native range for this test; otherwise
  // the queued focus work can race the later transfer to the prompt.
  await window.__blockNoteWaitForEditorFocus();
  expect(document.activeElement).toBe(editor);
  selection.setBaseAndExtent(text, 0, text, selectedText.length);

  const { x, y } = await vi.waitFor(() => {
    const button = document.querySelector('[data-test="editwithAI"]');
    if (!button) {
      throw new Error("AI toolbar button not found");
    }
    const box = getRect(button);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (!button.contains(document.elementFromPoint(x, y))) {
      throw new Error("AI toolbar button is not hit-testable at its center");
    }
    return { x, y };
  });
  expect(selection.toString()).toBe(selectedText);
  expect(selection.anchorNode).toBe(text);
  expect(selection.focusNode).toBe(text);

  // A real browser mouse click is needed to exercise the focus handoff.
  await clickAt(x, y);
  const prompt = await waitForSelector('input[name="ai-prompt"]:focus');

  // The AI menu shows the editor's current selection while the input has
  // focus. A collapsed or shifted range changes this visible highlight.
  await expect
    .poll(() =>
      Array.from(editor.querySelectorAll('[data-show-selection="true"]')).map(
        (highlight) => ({
          text: highlight.textContent,
          inSourceParagraph: paragraph.contains(highlight),
        }),
      ),
    )
    .toEqual([{ text: selectedText, inSourceParagraph: true }]);
  expect(document.activeElement).toBe(prompt);
});
