import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultStyleSpecs,
} from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
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

it.each(["initial mount", "remount"])(
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
