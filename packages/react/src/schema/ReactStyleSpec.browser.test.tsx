import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { acquireTiptapFixtureStyles } from "../../../../tests/src/commands/browser/tiptapFixtureStyles.js";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactStyleSpec } from "./ReactStyleSpec.js";

const highlight = createReactStyleSpec(
  { type: "highlight", propSchema: "boolean" },
  {
    render: ({ contentRef }) => (
      <span ref={contentRef} data-test-style="highlight" />
    ),
  },
);
const schema = BlockNoteSchema.create({
  styleSpecs: { ...defaultStyleSpecs, highlight },
});

it.for([
  "cursor",
  "forward selection",
  "backward selection",
  "mixed selection",
] as const)(
  "preserves the native selection when a React style mounts (%s)",
  async (selectionMode, { setupEditor, selectText, pressKey }) => {
    const { editor } = await setupEditor({
      skin: "raw",
      schema,
      initialContent: [
        {
          type: "paragraph",
          content:
            selectionMode === "mixed selection"
              ? [
                  { type: "text", text: "al", styles: {} },
                  { type: "text", text: "p", styles: { bold: true } },
                  { type: "text", text: "ha", styles: {} },
                ]
              : "alpha",
        },
      ],
    });
    const paragraph = editor.domElement!.querySelector("p")!;
    editor.focus();
    const [anchor, head] =
      selectionMode === "cursor"
        ? [2, 2]
        : selectionMode !== "backward selection"
          ? [1, 4]
          : [4, 1];
    if (selectionMode === "cursor") {
      selectText(editor, "al").collapseToEnd();
    } else {
      const selection = selectText(editor, "lph");
      if (selectionMode === "backward selection") {
        // BlockNote's text-selection setup cannot reverse the anchor and head.
        selection.collapseToEnd();
        for (let i = 0; i < 3; i++) {
          await pressKey("Shift+ArrowLeft");
        }
      }
    }
    function textOffset(node: Node, offset: number) {
      const range = document.createRange();
      range.setStart(paragraph, 0);
      range.setEnd(node, offset);
      return range.toString().length;
    }
    function endpoints() {
      const selection = document.getSelection();
      if (
        !selection?.anchorNode ||
        !selection.focusNode ||
        !paragraph.contains(selection.anchorNode) ||
        !paragraph.contains(selection.focusNode)
      ) {
        return undefined;
      }
      return [
        textOffset(selection.anchorNode, selection.anchorOffset),
        textOffset(selection.focusNode, selection.focusOffset),
      ];
    }

    await expect.poll(endpoints).toEqual([anchor, head]);
    editor.addStyles({ highlight: true });

    if (selectionMode !== "cursor") {
      // Wait for React to mount the new mark, not merely a selection that has
      // not moved yet. Mixed marks can split this text across several spans.
      await expect
        .poll(() =>
          Array.from(
            paragraph.querySelectorAll('[data-test-style="highlight"]'),
            (mark) => mark.textContent,
          ).join(""),
        )
        .toBe("lph");
    }
    await expect.poll(endpoints).toEqual([anchor, head]);

    // The first character creates a mark view for a collapsed selection.
    // React may commit it after ProseMirror has already placed the caret.
    await userEvent.keyboard("X");
    await userEvent.keyboard("Y");

    expect(paragraph.textContent).toBe(
      selectionMode === "cursor" ? "alXYpha" : "aXYa",
    );
    expect(editor.getActiveStyles()).toMatchObject({ highlight: true });
  },
);

it("does not refocus the editor after a React style mounts", async ({
  setupEditor,
  onTestFinished,
}) => {
  const { editor } = await setupEditor({
    skin: "raw",
    schema,
    initialContent: [{ type: "paragraph", content: "alpha" }],
  });
  const input = document.createElement("input");
  document.body.append(input);
  onTestFinished(() => input.remove());
  editor.focus();
  flushSync(() => {
    editor.updateBlock(editor.document[0], {
      content: [{ type: "text", text: "styled", styles: { highlight: true } }],
    });
  });
  // Focus can change between React's ref callback and reconciliation.
  input.focus();
  await userEvent.keyboard("X");

  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("X");
  expect(editor.document[0].content).toEqual([
    { type: "text", text: "styled", styles: { highlight: true } },
  ]);
});

it.for(["initial mount", "remount", "API remount"])(
  "keeps typing after text inserted with a React style (%s)",
  async (mountMode, { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema,
      initialContent: [{ type: "paragraph", content: [] }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const styles = acquireTiptapFixtureStyles(host.ownerDocument);
    let root: ReturnType<typeof createRoot> | undefined;
    try {
      const view = createRoot(host);
      root = view;
      function mount() {
        styles.track(() =>
          flushSync(() =>
            view.render(
              <>
                <button
                  onClick={() => {
                    editor.focus();
                    editor.insertInlineContent([
                      {
                        type: "text",
                        text: "Styled text",
                        styles: { highlight: true },
                      },
                    ]);
                  }}
                >
                  Insert styled text
                </button>
                <BlockNoteViewRaw
                  editor={editor}
                  formattingToolbar={false}
                  linkToolbar={false}
                  sideMenu={false}
                  slashMenu={false}
                />
              </>,
            ),
          ),
        );
      }

      mount();
      if (mountMode === "remount") {
        styles.track(() => flushSync(() => view.render(null)));
        mount();
      }
      if (mountMode === "API remount") {
        const element = editor.domElement!.parentElement!;
        styles.track(() => {
          editor.unmount();
          expect(editor.domElement).toBeUndefined();
          editor.mount(element);
        });
      }

      await userEvent.click(host.querySelector("button")!);
      await userEvent.keyboard(" continued");

      expect(editor.domElement?.querySelector("p")?.textContent).toBe(
        "Styled text continued",
      );
    } finally {
      styles.dispose(() => {
        try {
          root?.unmount();
        } finally {
          host.remove();
        }
      });
    }
  },
);
