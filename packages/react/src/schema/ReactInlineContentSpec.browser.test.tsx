import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

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

it.each([
  ["plain", "inline-block"],
  ["styled", "inline-block"],
  ["plain", "inline-flex"],
  ["styled", "inline-flex"],
] as const)(
  "records native input after clicking empty %s inline content with %s layout (#2142)",
  async (content, display) => {
    const schema = BlockNoteSchema.create().extend({
      inlineContentSpecs: {
        tag: createReactInlineContentSpec(
          { type: "tag", propSchema: {}, content },
          {
            render: ({ contentRef }) => (
              <span
                className="tag"
                ref={contentRef}
                style={{
                  display,
                  minWidth: 50,
                  minHeight: 20,
                }}
              />
            ),
          },
        ),
      },
    });
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [{ id: "paragraph", type: "paragraph", content: [] }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
      editor.setTextCursorPosition("paragraph", "start");
      editor.insertInlineContent([{ type: "tag" }]);
      await expect.poll(() => host.querySelector(".tag")).not.toBeNull();
      for (const text of ["a", "b"]) {
        // Click unused space again after the first character shrinks contentDOM.
        await userEvent.click(host.querySelector(".tag")!);
        // Native input bypasses ProseMirror's keypress insertion handler.
        document.execCommand("insertText", false, text);
        const expected = text === "a" ? "a" : "ab";
        await expect
          .poll(() => host.querySelector(".tag")?.textContent)
          .toBe(expected);
        expect(
          getComputedStyle(
            host.querySelector<HTMLElement>("[data-node-view-content-react]")!,
          ).display,
        ).toBe(display === "inline-flex" ? "block" : "inline");
        await expect
          .poll(() => editor.document[0].content)
          .toEqual([
            {
              type: "tag",
              props: {},
              content:
                content === "plain"
                  ? expected
                  : [{ type: "text", text: expected, styles: {} }],
            },
          ]);
      }
    } finally {
      root.unmount();
      editor.unmount();
      host.remove();
    }
  },
);
