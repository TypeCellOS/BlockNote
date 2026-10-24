import "@blocknote/core/style.css";

import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactInlineContentSpec } from "./ReactInlineContentSpec.js";

const tag = createReactInlineContentSpec(
  { type: "tag", propSchema: {}, content: "styled" },
  {
    render: ({ contentRef }) => (
      <span>
        #
        <span
          data-test="tag-content"
          ref={contentRef}
          style={{ display: "inline-block", minWidth: 50, minHeight: 20 }}
        />
      </span>
    ),
  },
);
const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { tag },
});

it.each([
  { name: "initial content", initial: true, text: "seed" },
  { name: "an inserted empty tag", initial: false, text: "" },
  { name: "an inserted tag with text", initial: false, text: "seed" },
])(
  "keeps $name connected to the document (#2142)",
  async ({ initial, text }) => {
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "paragraph",
          type: "paragraph",
          content: initial ? [{ type: "tag", content: text }] : [],
        },
      ],
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

      if (!initial) {
        editor.insertInlineContent([{ type: "tag", content: text }]);
      }

      const editable = await vi.waitFor(() => {
        const element = host.querySelector<HTMLElement>(
          '[data-test="tag-content"]',
        );
        expect(element).not.toBeNull();
        expect(element?.textContent).toBe(text);
        return element!;
      });

      editor.transact((tr) => {
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "tag") {
            tr.setSelection(
              TextSelection.create(tr.doc, pos + 1 + text.length),
            );
            return false;
          }
          return undefined;
        });
      });
      editor.focus();

      if (text === "") {
        // Match the report: click the visible empty input before typing into it.
        await userEvent.click(editable);
      }

      const selection = window.getSelection();
      const inputContext = JSON.stringify({
        parent: editor.prosemirrorState.selection.$from.parent.type.name,
        anchor: selection?.anchorNode?.parentElement?.outerHTML,
        anchorOffset: selection?.anchorOffset,
        content: editable.outerHTML,
        rect: editable.getBoundingClientRect().toJSON(),
      });

      // Both keyboard input and native edits must reach ProseMirror through this
      // node view's content DOM, so editor.document matches the visible text.
      if (text === "") {
        await userEvent.keyboard("added");
      } else {
        document.execCommand("insertText", false, "added");
      }

      await vi.waitFor(() => {
        expect(
          host.querySelector('[data-test="tag-content"]')?.textContent,
          `${inputContext}; after input: ${host.innerHTML}; document: ${JSON.stringify(editor.document)}`,
        ).toBe(`${text}added`);
        expect(editor.document[0].content).toEqual([
          {
            type: "tag",
            props: {},
            content: [{ type: "text", text: `${text}added`, styles: {} }],
          },
        ]);
      });
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
