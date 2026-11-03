import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";

// The iOS software keyboard emitted Shift on the first Delete after Return.
// Supply that modifier explicitly; emulation does not reproduce its OS choice.
test("Shift-Backspace joins blocks after native Enter", async () => {
  const editor = BlockNoteEditor.create({
    trailingBlock: false,
    initialContent: [{ type: "paragraph", content: "boom" }],
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
  try {
    editor.focus();
    editor.setTextCursorPosition(editor.document[0], "start");
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
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
  } finally {
    await view.unmount();
    editor._tiptapEditor.destroy();
  }
});
