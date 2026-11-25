import { BlockNoteSchema } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { expect } from "vite-plus/test";

import { userEvent } from "../../utils/context.js";

// Mobile Enter splits the DOM beside contentDOM. Reading that mutation must
// preserve the suffix in the model and reconcile the cloned editable wrapper.
it("native Enter in a React block preserves the suffix", async ({
  setupEditor,
}) => {
  const alert = createReactBlockSpec(
    { type: "alert", propSchema: {}, content: "inline" },
    {
      render: function Alert({ contentRef }) {
        return <div ref={contentRef} />;
      },
    },
  )();
  const schema = BlockNoteSchema.create().extend({ blockSpecs: { alert } });
  const { editor, rootNode } = await setupEditor({
    skin: "raw",
    schema,
    trailingBlock: false,
    initialContent: [
      { type: "paragraph", content: "Before" },
      { type: "alert", content: "boom" },
    ],
    props: {
      formattingToolbar: false,
      linkToolbar: false,
      sideMenu: false,
      slashMenu: false,
    },
  });
  editor.focus();
  await expect
    .poll(
      () =>
        rootNode.querySelector('[data-content-type="alert"] .bn-inline-content')
          ?.textContent,
    )
    .toBe("boom");
  const inline = rootNode.querySelector(
    '[data-content-type="alert"] .bn-inline-content',
  )!;
  const document = inline.ownerDocument;
  const text = document
    .createTreeWalker(inline, NodeFilter.SHOW_TEXT)
    .nextNode();
  if (text?.textContent !== "boom") {
    throw new Error("Expected the alert's editable text");
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
  for (const block of rootNode.querySelectorAll(
    '[data-content-type="alert"]',
  )) {
    expect(block.querySelectorAll(".bn-inline-content")).toHaveLength(1);
    expect(
      block.querySelectorAll("[data-node-view-content-react]"),
    ).toHaveLength(1);
  }
});
