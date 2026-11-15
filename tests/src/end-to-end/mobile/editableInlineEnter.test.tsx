import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import {
  BlockNoteViewRaw,
  createReactInlineContentSpec,
} from "@blocknote/react";
import { expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";

async function renderInlineEditor() {
  const token = createReactInlineContentSpec(
    { type: "token", propSchema: {}, content: "styled" },
    {
      render: function Token({ contentRef }) {
        return <span ref={contentRef} />;
      },
    },
  );
  const schema = BlockNoteSchema.create().extend({
    inlineContentSpecs: { token },
  });
  const editor = BlockNoteEditor.create({
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
  });
  const view = await render(
    <BlockNoteViewRaw
      editor={editor}
      formattingToolbar={false}
      linkToolbar={false}
      sideMenu={false}
      slashMenu={false}
    />,
  );
  return { editor, view };
}

test("Enter inside editable inline content allows typing and deletion", async () => {
  const { editor, view } = await renderInlineEditor();
  try {
    editor.focus();
    editor.setTextCursorPosition(editor.document[0], "start");
    editor._tiptapEditor.commands.setTextSelection(
      editor._tiptapEditor.state.selection.from + 4,
    );
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
  } finally {
    await view.unmount();
    editor._tiptapEditor.destroy();
  }
});

test("Shift-Backspace at an inline boundary preserves outside text", async () => {
  const { editor, view } = await renderInlineEditor();
  try {
    editor.focus();
    editor.setTextCursorPosition(editor.document[0], "start");
    editor._tiptapEditor.commands.setTextSelection(
      editor._tiptapEditor.state.selection.from + 3,
    );
    const before = editor.document;
    await userEvent.keyboard("{Shift>}{Backspace}{/Shift}");
    expect(editor.document).toEqual(before);
  } finally {
    await view.unmount();
    editor._tiptapEditor.destroy();
  }
});
