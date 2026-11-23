import type { BlockNoteEditor } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

// `editLink` focuses the view when done, so it needs a mounted editor; the
// lookup itself is covered headless in StyleManager.test.ts.
describe.each(["link", "x"])("link editing (%s)", (text) => {
  const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "before ", styles: {} },
              { type: "link", href: "https://example.com", content: text },
              { type: "text", text: " after", styles: {} },
            ],
          },
        ],
      });
      await use(editor);
    },
  });

  function expectLink(editor: BlockNoteEditor, href: string, text: string) {
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "before ", styles: {} },
      {
        type: "link",
        href,
        content: [{ type: "text", text, styles: {} }],
      },
      { type: "text", text: " after", styles: {} },
    ]);
  }

  // The edit path has the same edge as `getSelectedLinkUrl`: a lookup at
  // `position + 1` is outside the link at its end, so with only the last
  // character selected the form pre-filled the URL and then re-linked that
  // one character, splitting the link. Fails without `getMarkRange` in
  // `getLinkMarkAtPos`.
  it("edits the whole link with only its last character selected", ({
    editor,
    selectText,
  }) => {
    expectLink(editor, "https://example.com", text);
    selectText(editor, text.slice(-1));

    editor.editLink("https://changed.example", text);

    expectLink(editor, "https://changed.example", text);
  });

  it("replaces the whole link at its end", ({ editor, selectText }) => {
    selectText(editor, text).collapseToEnd();
    editor.editLink("https://changed.example", "updated");
    expectLink(editor, "https://changed.example", "updated");
  });

  it("unlinks at the end without removing text", ({ editor, selectText }) => {
    selectText(editor, text).collapseToEnd();
    editor.deleteLink();
    expect(editor.document[0].content).toEqual([
      { type: "text", text: `before ${text} after`, styles: {} },
    ]);
  });

  it("does not throw at the document end", ({ editor }) => {
    // Link APIs accept an absolute editor position, including the document end.
    const end = editor.transact((tr) => tr.doc.content.size);
    expect(() =>
      editor.editLink("https://changed.example", "updated", end),
    ).not.toThrow();
    expect(() => editor.deleteLink(end)).not.toThrow();
  });
});
