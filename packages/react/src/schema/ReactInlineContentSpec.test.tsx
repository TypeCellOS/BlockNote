import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactInlineContentSpec } from "./ReactInlineContentSpec.js";

function createSchema(content: "styled" | "plain") {
  const config =
    content === "styled"
      ? ({ type: "tag", propSchema: {}, content: "styled" } as const)
      : ({ type: "tag", propSchema: {}, content: "plain" } as const);
  const tag = createReactInlineContentSpec(config, {
    render: ({ contentRef }) => (
      <span>
        #<span data-test="tag-content" ref={contentRef} />
      </span>
    ),
  });
  return BlockNoteSchema.create().extend({
    inlineContentSpecs: { tag },
  });
}

it.each(["styled", "plain"] as const)(
  "renders inserted %s inline content inside its contentRef element (#2142)",
  async (content) => {
    const editor = BlockNoteEditor.create({
      schema: createSchema(content),
      trailingBlock: false,
      initialContent: [{ id: "paragraph", type: "paragraph" }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      flushSync(() => {
        root.render(
          <BlockNoteViewRaw
            editor={editor}
            formattingToolbar={false}
            linkToolbar={false}
            sideMenu={false}
            slashMenu={false}
          />,
        );
      });
      editor.insertInlineContent([{ type: "tag", content: "seed" }]);

      await vi.waitFor(() => {
        expect(
          host.querySelector('[data-test="tag-content"]')?.textContent,
          host.innerHTML,
        ).toBe("seed");
      });
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
