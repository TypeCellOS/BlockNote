import { Mark } from "@tiptap/core";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createExtension } from "../../../editor/BlockNoteExtension.js";
import { BLOCK_LEVEL_SUGGESTION_GROUP } from "../../../pm-nodes/suggestionMarks.js";
import { selectedFragmentToHTML } from "./copyExtension.js";

describe("selectedFragmentToHTML", () => {
  it.each(["comment", "insertion", "deletion", "modification", "custom"])(
    "strips ignored %s marks while preserving content, formatting, and the source",
    (name) => {
      const annotation = Mark.create({
        name,
        group: BLOCK_LEVEL_SUGGESTION_GROUP,
        renderHTML() {
          return ["span", { "data-annotation": name }, 0];
        },
        extendMarkSchema(extension) {
          return extension.name === name ? { blocknoteIgnore: true } : {};
        },
      });
      const editor = BlockNoteEditor.create({
        initialContent: [
          {
            type: "paragraph",
            content: [
              {
                type: "link",
                href: "https://example.com",
                content: [
                  { type: "text", text: "Hello", styles: { bold: true } },
                ],
              },
            ],
          },
        ],
        trailingBlock: false,
        extensions: [
          createExtension({
            key: "test-annotation",
            tiptapExtensions: [annotation],
          }),
        ],
      });
      editor.mount(document.createElement("div"));
      try {
        editor.transact((tr) => {
          const mark = editor.pmSchema.marks[name].create();
          tr.addMark(3, 8, mark);
          tr.addNodeMark(2, mark);
        });

        // Exercise both an open text slice and a complete block with nested marks.
        for (const selection of [
          TextSelection.create(editor.prosemirrorState.doc, 3, 8),
          NodeSelection.create(editor.prosemirrorState.doc, 1),
        ]) {
          editor.transact((tr) => tr.setSelection(selection));
          const before = editor.prosemirrorState.doc.toJSON();
          const { clipboardHTML, externalHTML, markdown } =
            selectedFragmentToHTML(editor.prosemirrorView, editor);

          for (const html of [clipboardHTML, externalHTML]) {
            expect(html).toContain("Hello");
            expect(html).toContain("https://example.com");
            expect(html).toMatch(/<(strong|b)[ >]/);
            expect(html).not.toContain("data-annotation");
          }
          expect(markdown).toContain("Hello");
          expect(editor.prosemirrorState.doc.toJSON()).toEqual(before);
        }
      } finally {
        editor.unmount();
      }
    },
  );
});
