import { BlockNoteSchema } from "@blocknote/core";
import { expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

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

it.for([
  ["plain", "insertion"],
  ["styled", "insertion"],
  ["plain", "undo"],
  ["styled", "undo"],
] as const)(
  "mounts %s inline content inside its contentRef after %s",
  async ([content, action], { setupEditor }) => {
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
    const { editor, rootNode: host } = await setupEditor({
      skin: "raw",
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
  },
);

it.for([
  ["plain", "inline-block"],
  ["styled", "inline-block"],
  ["plain", "inline-flex"],
  ["styled", "inline-flex"],
] as const)(
  "records native input after clicking empty %s inline content with %s layout (#2142)",
  async ([content, display], { setupEditor }) => {
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
    const { editor, rootNode: host } = await setupEditor({
      skin: "raw",
      schema,
      trailingBlock: false,
      initialContent: [{ id: "paragraph", type: "paragraph", content: [] }],
    });
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
  },
);
