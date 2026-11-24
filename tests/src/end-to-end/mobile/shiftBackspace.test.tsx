import { expect } from "vite-plus/test";

import { userEvent } from "../../utils/context.js";

// The iOS software keyboard emitted Shift on the first Delete after Return.
// Supply that modifier explicitly; emulation does not reproduce its OS choice.
it("Shift-Backspace joins blocks after native Enter", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    trailingBlock: false,
    initialContent: [{ type: "paragraph", content: "boom" }],
  });
  editor.focus();
  await window.__blockNoteWaitForEditorFocus();
  // The starting caret is setup; only Enter and Shift-Backspace are under test.
  const inline = editor.domElement?.querySelector(".bn-inline-content");
  if (!inline) {
    throw new Error("Expected the paragraph's editable content");
  }
  const text = document
    .createTreeWalker(inline, NodeFilter.SHOW_TEXT)
    .nextNode();
  if (text?.textContent !== "boom") {
    throw new Error("Expected the paragraph's editable text");
  }
  const selection = document.getSelection()!;
  selection.collapse(text, 2);
  await expect
    .poll(
      () =>
        selection.isCollapsed &&
        selection.anchorNode === text &&
        selection.anchorOffset === 2,
    )
    .toBe(true);
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => editor.document.length).toBe(2);
  expect(editor.document).toMatchObject([
    { content: [{ type: "text", text: "bo" }] },
    { content: [{ type: "text", text: "om" }] },
  ]);
  await userEvent.keyboard("{Shift>}{Backspace}{/Shift}");
  expect(editor.document).toHaveLength(1);
  expect(editor.document[0].content).toMatchObject([
    { type: "text", text: "boom" },
  ]);
});
