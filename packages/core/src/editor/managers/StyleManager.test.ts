import { TextSelection } from "prosemirror-state";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../BlockNoteEditor.js";

// The "last character" and "one-character link" cases fail with a lookup at
// `from + 1`: that lands on the link's end boundary, where the non-inclusive
// link mark is not reported.
describe("getSelectedLinkUrl", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
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
  });

  /** Start and end positions of the text node carrying `href`. */
  function linkRange(href: string) {
    let range: { from: number; to: number } | undefined;
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (
        node.isText &&
        node.marks.some(
          (mark) => mark.type.name === "link" && mark.attrs.href === href,
        )
      ) {
        range = { from: pos, to: pos + node.nodeSize };
      }
      return range === undefined;
    });
    if (!range) {
      throw new Error(`no link ${href} in the document`);
    }
    return range;
  }

  function select(from: number, to = from) {
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, to)),
    );
  }

  it("reads the URL for the whole link", () => {
    const { from, to } = linkRange("https://example.com");
    select(from, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  it("reads the URL for the link's last character", () => {
    const { to } = linkRange("https://example.com");
    select(to - 1, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  it("reads the URL for a one-character link", () => {
    const { from, to } = linkRange("https://one.example");
    select(from, to);
    expect(editor.getSelectedLinkUrl()).toBe("https://one.example");
  });

  it("reads the URL for a caret inside the link", () => {
    const { from } = linkRange("https://example.com");
    select(from + 2);
    expect(editor.getSelectedLinkUrl()).toBe("https://example.com");
  });

  it("reads no URL outside links", () => {
    const { from } = linkRange("https://example.com");
    select(from - 3, from - 1);
    expect(editor.getSelectedLinkUrl()).toBeUndefined();
  });

  it("reads no URL for a selection starting right after a link", () => {
    const { to } = linkRange("https://example.com");
    select(to, to + 3);
    expect(editor.getSelectedLinkUrl()).toBeUndefined();
  });

  // The edit path is covered in StyleManager.browser.test.ts (it needs a
  // mounted view); the lookup it relies on is pinned here.
  it("finds the link at either edge for editing", () => {
    const { from, to } = linkRange("https://example.com");
    expect(editor.getLinkMarkAtPos(from)?.href).toBe("https://example.com");
    expect(editor.getLinkMarkAtPos(to)?.href).toBe("https://example.com");
    expect(editor.getLinkMarkAtPos(from - 2)).toBeUndefined();
  });
});
