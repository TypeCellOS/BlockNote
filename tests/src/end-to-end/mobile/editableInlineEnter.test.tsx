import { BlockNoteSchema } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { expect, type TestContext } from "vite-plus/test";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { userEvent } from "../../utils/context.js";

async function setupInlineEditor(
  setupEditor: SetupEditor,
  onTestFinished: TestContext["onTestFinished"],
  offset: number,
) {
  const token = createReactInlineContentSpec(
    { type: "token", propSchema: {}, content: "styled" },
    {
      render: function Token({ contentRef }) {
        return <span data-test="editable-token" ref={contentRef} />;
      },
    },
  );
  const schema = BlockNoteSchema.create().extend({
    inlineContentSpecs: { token },
  });
  const { editor, rootNode } = await setupEditor({
    skin: "raw",
    schema,
    trailingBlock: false,
    initialContent: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "ab", styles: {} },
          {
            type: "token",
            props: {},
            content: [{ type: "text", text: "cd", styles: {} }],
          },
          { type: "text", text: "ef", styles: {} },
        ],
      },
    ],
    props: {
      formattingToolbar: false,
      linkToolbar: false,
      sideMenu: false,
      slashMenu: false,
    },
  });
  const tokenElement = rootNode.querySelector('[data-test="editable-token"]');
  if (!tokenElement) {
    throw new Error("Missing editable token");
  }
  const text = document
    .createTreeWalker(tokenElement, NodeFilter.SHOW_TEXT)
    .nextNode();
  if (!(text instanceof Text)) {
    throw new Error("Missing editable token text");
  }
  editor.focus();
  // Let the browser deliver the selection change before sending a key.
  const selection = document.getSelection();
  if (!selection) {
    throw new Error("Missing document selection");
  }
  const listener = new AbortController();
  onTestFinished(() => listener.abort());
  let changed = false;
  document.addEventListener(
    "selectionchange",
    () => {
      changed = true;
    },
    { once: true, signal: listener.signal },
  );
  selection.collapse(text, offset);
  await expect.poll(() => changed).toBe(true);
  return editor;
}

it("Enter inside editable inline content allows typing and deletion", async ({
  setupEditor,
  onTestFinished,
}) => {
  const editor = await setupInlineEditor(setupEditor, onTestFinished, 1);
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => editor.document.length).toBe(2);
  expect(editor.document[0].content).toMatchObject([
    { type: "text", text: "ab" },
    { type: "token", content: [{ type: "text", text: "c" }] },
  ]);
  expect(editor.document[1].content).toMatchObject([
    { type: "token", content: [{ type: "text", text: "d" }] },
    { type: "text", text: "ef" },
  ]);
  await userEvent.keyboard("X");
  await expect
    .poll(() => editor.document[1].content)
    .toMatchObject([
      { type: "token", content: [{ type: "text", text: "Xd" }] },
      { type: "text", text: "ef" },
    ]);
  // Deletion can still empty the token, and typing can refill it.
  await userEvent.keyboard("{Backspace}{Delete}Y");
  await expect
    .poll(() => editor.document[1].content)
    .toMatchObject([
      { type: "token", content: [{ type: "text", text: "Y" }] },
      { type: "text", text: "ef" },
    ]);
});

it("Shift-Backspace at an inline boundary preserves outside text", async ({
  setupEditor,
  onTestFinished,
}) => {
  const editor = await setupInlineEditor(setupEditor, onTestFinished, 0);
  const before = editor.document;
  await userEvent.keyboard("{Shift>}{Backspace}{/Shift}");
  expect(editor.document).toEqual(before);
});
