import { TextSelection } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../BlockNoteEditor.js";

// The "last character" and "one-character link" cases fail with a lookup at
// `from + 1`: that lands on the link's end boundary, where the non-inclusive
// link mark is not reported.
describe("getSelectedLinkUrl", () => {
  const test = it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "before ", styles: {} },
              { type: "link", href: "https://example.com", content: "link" },
              { type: "text", text: " after ", styles: {} },
              { type: "link", href: "https://one.example", content: "x" },
            ],
          },
        ],
      });
      await use(editor);
    },
  });

  /** Start and end positions of the text node carrying `href`. */
  function linkRange(editor: BlockNoteEditor, href: string) {
    let range: { from: number; to: number } | undefined;
    editor.transact((tr) =>
      tr.doc.descendants((node, pos) => {
        if (
          node.isText &&
          node.marks.some(
            (mark) => mark.type.name === "link" && mark.attrs.href === href,
          )
        ) {
          range = { from: pos, to: pos + node.nodeSize };
        }
        return range === undefined;
      }),
    );
    if (!range) {
      throw new Error(`no link ${href} in the document`);
    }
    return range;
  }

  function select(editor: BlockNoteEditor, from: number, to = from) {
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, to)),
    );
  }

  test("reads the URL for the whole link", ({ editor }) => {
    const { from, to } = linkRange(editor, "https://example.com");
    select(editor, from, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  test("reads the URL for the link's last character", ({ editor }) => {
    const { to } = linkRange(editor, "https://example.com");
    select(editor, to - 1, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  test("reads the URL for a one-character link", ({ editor }) => {
    const { from, to } = linkRange(editor, "https://one.example");
    select(editor, from, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://one.example");
  });

  test("reads the URL for a caret inside the link", ({ editor }) => {
    const { from } = linkRange(editor, "https://example.com");
    select(editor, from + 2);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  test("reads no URL outside links", ({ editor }) => {
    const { from } = linkRange(editor, "https://example.com");
    select(editor, from - 3, from - 1);
    expect(editor.getSelectedLinkUrl()).toBeUndefined();
  });

  test("reads no URL for a selection starting right after a link", ({
    editor,
  }) => {
    const { to } = linkRange(editor, "https://example.com");
    select(editor, to, to + 3);
    expect(editor.getSelectedLinkUrl()).toBeUndefined();
  });

  // The edit path is covered in StyleManager.browser.test.ts (it needs a
  // mounted view); the lookup it relies on is pinned here.
  test("finds the link at either edge for editing", ({ editor }) => {
    const { from, to } = linkRange(editor, "https://example.com");
    expect(editor.getLinkMarkAtPos(from)?.href).toBe("https://example.com");
    expect(editor.getLinkMarkAtPos(to)?.href).toBe("https://example.com");
    expect(editor.getLinkMarkAtPos(from - 2)).toBeUndefined();
  });
});

describe("getSelectedText", () => {
  it("separates text from different blocks with a newline", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        { type: "paragraph", content: "First" },
        {
          type: "paragraph",
          content: "Second",
          children: [{ type: "paragraph", content: "Nested" }],
        },
        { type: "heading", content: "Third" },
      ],
    });
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.between(
          tr.doc.resolve(1),
          tr.doc.resolve(tr.doc.content.size - 1),
        ),
      ),
    );
    expect(editor.getSelectedText()).toBe("First\nSecond\nNested\nThird");
  });

  it("returns the text of a selection within one block unchanged", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [{ type: "paragraph", content: "Hello world" }],
    });
    editor.setTextCursorPosition(editor.document[0], "start");
    editor.transact((tr) => {
      const start = tr.selection.from;
      tr.setSelection(TextSelection.create(tr.doc, start, start + 5));
    });
    expect(editor.getSelectedText()).toBe("Hello");
  });
});
