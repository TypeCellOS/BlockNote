import { TextSelection } from "prosemirror-state";
import { expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { createInlineContentSpec } from "../../schema/inlineContent/createSpec.js";

it.each([
  { key: "ArrowRight", keyCode: 39, anchor: 9, head: 10, expectedHead: 15 },
  { key: "ArrowLeft", keyCode: 37, anchor: 16, head: 15, expectedHead: 10 },
])(
  "extends $key selections across a preview",
  ({ key, keyCode, anchor, head, expectedHead }) => {
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create().extend({
        inlineContentSpecs: {
          preview: createInlineContentSpec(
            { type: "preview", propSchema: {}, content: "plain" },
            {
              meta: { hasPreview: true },
              render() {
                const dom = document.createElement("span");
                return { dom, contentDOM: dom };
              },
            },
          ),
        },
      }),
      trailingBlock: false,
      initialContent: [
        {
          type: "paragraph",
          content: ["before ", { type: "preview", content: "x^2" }, " after"],
        },
      ],
    });
    editor.mount(document.createElement("div"));
    try {
      // The preview spans positions 10–15 (three source characters plus its edges).
      editor.transact((tr) =>
        tr.setSelection(TextSelection.create(tr.doc, anchor, head)),
      );
      const event = new KeyboardEvent("keydown", {
        key,
        keyCode,
        shiftKey: true,
      });
      editor.prosemirrorView.someProp("handleKeyDown", (handleKeyDown) =>
        handleKeyDown(editor.prosemirrorView, event),
      );
      expect(editor.prosemirrorState.selection.toJSON()).toEqual({
        type: "text",
        anchor,
        head: expectedHead,
      });
    } finally {
      editor._tiptapEditor.destroy();
    }
  },
);
