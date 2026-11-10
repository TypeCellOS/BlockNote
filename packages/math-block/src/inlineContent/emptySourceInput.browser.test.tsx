import "@blocknote/core/style.css";

import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { getMathSlashMenuItems } from "../getMathSlashMenuItems.js";
import { en } from "../i18n/locales/en.js";
import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

// Dead keys (`^` on AZERTY) and IME commits insert text natively, like this.
function insertTextNatively(text: string) {
  document.execCommand("insertText", false, text);
}

it.each([
  // Without the CSS line box, Chromium & WebKit insert outside the source.
  { name: "an empty source", typedFirst: "", deleteNatively: false },
  // `MathInlinePreviewWithPopup` trims the source, so " " used to render the
  // React `<br>` next to non-empty DOM, which Firefox removed while inserting.
  { name: "a whitespace-only source", typedFirst: " ", deleteNatively: false },
  // Like Option+Backspace. Chromium used to also remove the source's inline
  // ancestors, which tiptap ignores as outside the content DOM.
  {
    name: "a source emptied by a native deletion",
    typedFirst: "hello",
    deleteNatively: true,
  },
])(
  "natively inserts text into $name (#3234)",
  async ({ typedFirst, deleteNatively }) => {
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [{ id: "paragraph", type: "paragraph" }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    function getMathSource() {
      let source: string | undefined;
      editor.prosemirrorState.doc.descendants((node) => {
        if (node.type.name === "math") {
          source = node.textContent;
        }
      });
      return source;
    }

    try {
      flushSync(() => {
        root.render(<BlockNoteViewRaw editor={editor} />);
      });
      editor.setTextCursorPosition("paragraph", "end");
      editor.focus();

      // Inserts the equation the way the slash menu does, which also moves the
      // caret into its source.
      const item = getMathSlashMenuItems(editor).find(
        (item) => item.title === en.slash_menu.inline_math.title,
      );
      if (!item) {
        throw new Error("Inline math slash menu item not found");
      }
      item.onItemClick();
      // The item opens the popup in an animation frame, which headless WebKit
      // sometimes delays past `waitFor`'s default 1s.
      const pre = await vi.waitFor(
        () => {
          const pre = host.querySelector(
            ".bn-preview-with-source-popup[data-open='true'] pre",
          );
          if (!pre) {
            throw new Error("The source popup isn't open yet");
          }
          return pre;
        },
        { timeout: 5000 },
      );

      if (typedFirst) {
        await userEvent.keyboard(typedFirst);
        await vi.waitFor(() => expect(getMathSource()).toBe(typedFirst));
      }

      if (deleteNatively) {
        // Deletes the word natively (Option+Backspace on macOS; the suite runs
        // on Linux).
        await userEvent.keyboard("{Control>}{Backspace}{/Control}");
        await vi.waitFor(() => expect(getMathSource()).toBe(""));
      }

      insertTextNatively("^");

      const expected = (deleteNatively ? "" : typedFirst) + "^";
      await vi.waitFor(() =>
        expect(getMathSource(), pre.innerHTML).toBe(expected),
      );
      expect(editor.prosemirrorView?.dom.isConnected).toBe(true);
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
