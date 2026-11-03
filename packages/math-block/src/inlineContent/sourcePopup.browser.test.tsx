import "@blocknote/core/style.css";

import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { SourceInlineContentWithPreviewExtension } from "@blocknote/core/extensions";
import { BlockNoteViewRaw } from "@blocknote/react";
import { TextSelection } from "prosemirror-state";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

it.each([false, true])(
  "only opens selected inline math when editable (editable: %s, #3291)",
  async (editable) => {
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "math", content: "x^2" }],
        },
      ],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      flushSync(() => {
        root.render(<BlockNoteViewRaw editor={editor} editable={editable} />);
      });

      let mathPos: number | undefined;
      editor.prosemirrorState.doc.descendants((node, pos) => {
        if (node.type.name === "math") {
          mathPos = pos;
        }
      });
      if (mathPos === undefined) {
        throw new Error("Inline math node not found");
      }
      const sourcePos = mathPos + 1;

      // Read-only ProseMirror views still move the selection on click. Exercise
      // that selection path directly, independently of the guarded preview click.
      flushSync(() => {
        editor.transact((tr) =>
          tr.setSelection(TextSelection.create(tr.doc, sourcePos)),
        );
      });

      expect(editor.prosemirrorState.selection.from).toBe(sourcePos);
      expect(
        editor.getExtension(SourceInlineContentWithPreviewExtension)!.store
          .state.selected,
      ).toBe(editable ? mathPos : undefined);
      await vi.waitFor(() =>
        expect(
          host
            .querySelector(".bn-preview-with-source-popup")
            ?.getAttribute("data-open"),
        ).toBe(String(editable)),
      );
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
