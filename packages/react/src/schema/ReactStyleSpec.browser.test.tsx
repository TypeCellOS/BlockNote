import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultStyleSpecs,
} from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { TextSelection } from "@tiptap/pm/state";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactStyleSpec } from "./ReactStyleSpec.js";

const highlight = createReactStyleSpec(
  { type: "highlight", propSchema: "boolean" },
  { render: ({ contentRef }) => <span ref={contentRef} /> },
);
const schema = BlockNoteSchema.create({
  styleSpecs: { ...defaultStyleSpecs, highlight },
});

it.each([
  "cursor",
  "forward selection",
  "backward selection",
  "mixed selection",
] as const)(
  "preserves the native selection when a React style mounts (%s)",
  async (selectionMode) => {
    const editor = BlockNoteEditor.create({
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
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
      const view = editor.prosemirrorView;
      const [anchor, head] =
        selectionMode === "cursor"
          ? [5, 5]
          : selectionMode !== "backward selection"
            ? [4, 7]
            : [7, 4];
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, anchor, head),
        ),
      );
      view.focus();
      expect(document.getSelection()?.toString()).toBe(
        selectionMode === "cursor" ? "" : "lph",
      );
      editor.addStyles({ highlight: true });

      // Mounting a mark must preserve both endpoints, including a backwards
      // selection, rather than merely retaining the selected text.
      await expect
        .poll(() => {
          const selection = document.getSelection();
          if (!selection?.anchorNode || !selection.focusNode) {
            return undefined;
          }
          return [
            view.posAtDOM(selection.anchorNode, selection.anchorOffset),
            view.posAtDOM(selection.focusNode, selection.focusOffset),
          ];
        })
        .toEqual([anchor, head]);

      // The first character creates a mark view for a collapsed selection.
      // React may commit it after ProseMirror has already placed the caret.
      await userEvent.keyboard("X");
      await userEvent.keyboard("Y");

      expect(editor.prosemirrorState.doc.textContent).toBe(
        selectionMode === "cursor" ? "alXYpha" : "aXYa",
      );
      expect(editor.getActiveStyles()).toMatchObject({ highlight: true });
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);

it("does not refocus the editor after a React style mounts", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ type: "paragraph", content: "alpha" }],
  });
  const host = document.createElement("div");
  const input = document.createElement("input");
  document.body.append(host, input);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
    editor.prosemirrorView.focus();
    flushSync(() => {
      editor.updateBlock(editor.document[0], {
        content: [
          { type: "text", text: "styled", styles: { highlight: true } },
        ],
      });
    });
    // Focus can change between React's ref callback and reconciliation.
    input.focus();
    await userEvent.keyboard("X");

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("X");
    expect(editor.prosemirrorState.doc.textContent).toBe("styled");
  } finally {
    root.unmount();
    editor._tiptapEditor.destroy();
    host.remove();
    input.remove();
  }
});

it.each(["initial mount", "remount", "API remount"])(
  "keeps typing after text inserted with a React style (%s)",
  async (mountMode) => {
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [{ type: "paragraph", content: [] }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    function mount() {
      flushSync(() => {
        root.render(
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
        );
      });
    }

    try {
      mount();
      if (mountMode === "remount") {
        flushSync(() => root.render(null));
        mount();
      }
      if (mountMode === "API remount") {
        const element = editor.prosemirrorView.dom.parentElement!;
        editor.unmount();
        expect(editor._tiptapEditor.isEditorContentInitialized).toBe(false);
        editor.mount(element);
      }

      await userEvent.click(host.querySelector("button")!);
      await userEvent.keyboard(" continued");

      expect(editor.prosemirrorState.doc.textContent).toBe(
        "Styled text continued",
      );
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
