import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";

// Mobile Enter splits the DOM beside contentDOM. Reading that mutation must
// preserve the suffix in the model and reconcile the cloned editable wrapper.
test("native Enter in a React block preserves the suffix", async () => {
  const alert = createReactBlockSpec(
    { type: "alert", propSchema: {}, content: "inline" },
    {
      render: function Alert({ contentRef }) {
        return <div ref={contentRef} />;
      },
    },
  )();
  const schema = BlockNoteSchema.create().extend({ blockSpecs: { alert } });
  const editor = BlockNoteEditor.create({
    schema,
    trailingBlock: false,
    initialContent: [{ type: "paragraph", content: "Before" }],
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
    editor.insertBlocks(
      [{ type: "alert", content: "boom" }],
      editor.document[0],
      "after",
    );
    await expect
      .poll(
        () =>
          view.container.querySelector(
            '[data-content-type="alert"] .bn-inline-content',
          )?.textContent,
      )
      .toBe("boom");
    editor.setTextCursorPosition(editor.document[1], "start");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => editor.document.length).toBe(3);
    expect(editor.document[1].content).toEqual([
      { type: "text", text: "bo", styles: {} },
    ]);
    expect(editor.document[2].content).toEqual([
      { type: "text", text: "om", styles: {} },
    ]);
    await userEvent.keyboard("After");
    await expect
      .poll(() => editor.document[2].content)
      .toEqual([{ type: "text", text: "Afterom", styles: {} }]);
    for (const block of view.container.querySelectorAll(
      '[data-content-type="alert"]',
    )) {
      expect(block.querySelectorAll(".bn-inline-content")).toHaveLength(1);
      expect(
        block.querySelectorAll("[data-node-view-content-react]"),
      ).toHaveLength(1);
    }
  } finally {
    await view.unmount();
    editor._tiptapEditor.destroy();
  }
});
