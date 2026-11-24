import { expect } from "vite-plus/test";

import { BlockNoteSchema } from "../../../../blocks/BlockNoteSchema.js";
import { createInlineContentSpec } from "../../../../schema/inlineContent/createSpec.js";
import { splitBlockTr } from "./splitBlock.js";

// Exercise the transform through a headless BlockNote editor and its real schema.
const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: {
    token: createInlineContentSpec(
      {
        type: "token",
        content: "styled",
        propSchema: { label: { default: "keep" } },
      },
      {
        render() {
          const dom = document.createElement("span");
          return { dom, contentDOM: dom };
        },
      },
    ),
  },
});

it.for([0, 1, 2])(
  "split inside editable inline content at offset %s",
  async (offset, { setupEditor, selectText }) => {
    const { editor } = await setupEditor({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "ab", styles: {} },
            {
              type: "token",
              props: { label: "custom" },
              content: [{ type: "text", text: "cd", styles: {} }],
            },
            { type: "text", text: "ef", styles: {} },
          ],
        },
      ],
    });
    const marks = [editor.pmSchema.marks.bold.create()];
    editor.transact((tr) => {
      // doc > blockGroup > blockContainer > paragraph > token > text
      const pos = 6 + offset;
      const token = tr.doc.nodeAt(5)!;
      tr.setNodeMarkup(5, undefined, token.attrs, marks);
      if (offset === 0) {
        selectText(editor, "cd").collapseToStart();
      } else {
        selectText(editor, "cd".slice(0, offset)).collapseToEnd();
      }
      expect(tr.selection.from).toBe(pos);
      expect(splitBlockTr(tr, pos)).toBe(true);
      tr.doc.check();
      const group = tr.doc.firstChild!;
      expect(group.childCount).toBe(2);
      expect(group.child(0).firstChild!.textContent).toBe(
        "ab" + "cd".slice(0, offset),
      );
      expect(group.child(1).firstChild!.textContent).toBe(
        "cd".slice(offset) + "ef",
      );
      const left = group.child(0).firstChild!.lastChild!;
      const right = group.child(1).firstChild!.firstChild!;
      expect(left.type.name).toBe("token");
      expect(right.type.name).toBe("token");
      expect(left.attrs.label).toBe("custom");
      expect(right.attrs.label).toBe("custom");
      expect(left.marks).toEqual(marks);
      expect(right.marks).toEqual(marks);
      expect(tr.selection.$from.parent.type.name).toBe("token");
      expect(tr.selection.$from.parentOffset).toBe(0);
    });
    expect(editor.document).toHaveLength(2);
  },
);
