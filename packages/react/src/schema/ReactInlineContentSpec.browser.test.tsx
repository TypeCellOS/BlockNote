import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it } from "vite-plus/test";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactInlineContentSpec } from "./ReactInlineContentSpec.js";

function renderSource({
  contentRef,
}: {
  contentRef: (node: HTMLElement | null) => void;
}) {
  return (
    <span>
      <span contentEditable={false}>Preview</span>
      <span className="source" ref={contentRef} />
    </span>
  );
}

it.each([
  ["plain", "insertion"],
  ["styled", "insertion"],
  ["plain", "undo"],
  ["styled", "undo"],
] as const)(
  "mounts %s inline content inside its contentRef after %s",
  async (content, action) => {
    const schema = BlockNoteSchema.create().extend({
      inlineContentSpecs: {
        plain: createReactInlineContentSpec(
          { type: "plain", propSchema: {}, content: "plain" },
          { render: renderSource },
        ),
        styled: createReactInlineContentSpec(
          { type: "styled", propSchema: {}, content: "styled" },
          { render: renderSource },
        ),
      },
    });
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "paragraph",
          type: "paragraph",
          content:
            action === "undo"
              ? [{ type: content, props: {}, content: "x^2" }]
              : [],
        },
      ],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    async function expectContentMounted() {
      await expect
        .poll(
          () =>
            host.querySelector(
              `[data-inline-content-type="${content}"] .source`,
            )?.textContent,
        )
        .toBe("x^2");
      const inline = host.querySelector(
        `[data-inline-content-type="${content}"]`,
      );
      const source = inline?.querySelector(".source");
      expect(source?.textContent).toBe("x^2");
      // Checking the actual parent, not the marker attribute, catches content
      // appended beside the preview when TipTap creates contentDOM after React.
      expect(
        inline?.querySelector("[data-node-view-content-react]")?.parentElement,
      ).toBe(source);
      expect(inline?.textContent).toBe("Previewx^2");
    }

    try {
      flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
      if (action === "insertion") {
        editor.setTextCursorPosition("paragraph", "start");
        editor.insertInlineContent([
          { type: content, props: {}, content: "x^2" },
        ]);
      } else {
        await expectContentMounted();
        editor.removeBlocks(["paragraph"]);
        expect(host.querySelector(".source")).toBeNull();
        expect(editor.undo()).toBe(true);
      }
      await expectContentMounted();
    } finally {
      root.unmount();
      editor.unmount();
      host.remove();
    }
  },
);
