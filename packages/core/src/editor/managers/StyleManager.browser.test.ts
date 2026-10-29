import { TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../BlockNoteEditor.js";

// `editLink` focuses the view when done, so it needs a mounted editor; the
// lookup itself is covered headless in StyleManager.test.ts.
describe.each(["link", "x"])("link editing (%s)", (text) => {
  let editor: BlockNoteEditor;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    const mountPoint = document.createElement("div");
    container.append(mountPoint);
    document.body.append(container);
    editor = BlockNoteEditor.create({
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
    editor.mount(mountPoint);
  });

  afterEach(() => {
    editor.unmount();
    container.remove();
  });

  /** Text nodes carrying a link mark, in document order, with positions. */
  function links() {
    const found: { href: string; text: string; from: number; to: number }[] =
      [];
    editor.prosemirrorState.doc.descendants((node, pos) => {
      const link = node.marks.find((mark) => mark.type.name === "link");
      if (node.isText && link) {
        found.push({
          href: link.attrs.href,
          text: node.text ?? "",
          from: pos,
          to: pos + node.nodeSize,
        });
      }
    });
    return found;
  }

  // The edit path has the same edge as `getSelectedLinkUrl`: a lookup at
  // `position + 1` is outside the link at its end, so with only the last
  // character selected the form pre-filled the URL and then re-linked that
  // one character, splitting the link. Fails without `getMarkRange` in
  // `getLinkMarkAtPos`.
  it("edits the whole link with only its last character selected", () => {
    const [link] = links();
    expect(link).toMatchObject({ href: "https://example.com", text });
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, link.to - 1, link.to)),
    );

    editor.editLink("https://changed.example", text);

    expect(links()).toEqual([
      {
        href: "https://changed.example",
        text,
        from: link.from,
        to: link.to,
      },
    ]);
  });

  it("replaces the whole link at its end", () => {
    const [link] = links();
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, link.to)),
    );
    editor.editLink("https://changed.example", "updated");
    expect(links()).toEqual([
      {
        href: "https://changed.example",
        text: "updated",
        from: link.from,
        to: link.from + 7,
      },
    ]);
    expect(editor.prosemirrorState.doc.textContent).toBe(
      "before updated after",
    );
  });

  it("unlinks at the end without removing text", () => {
    const [link] = links();
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, link.to)),
    );
    editor.deleteLink();
    expect(links()).toEqual([]);
    expect(editor.prosemirrorState.doc.textContent).toBe(
      `before ${text} after`,
    );
  });

  it("does not throw at the document end", () => {
    expect(() =>
      editor.editLink(
        "https://changed.example",
        "updated",
        editor.prosemirrorState.doc.content.size,
      ),
    ).not.toThrow();
    expect(() =>
      editor.deleteLink(editor.prosemirrorState.doc.content.size),
    ).not.toThrow();
  });
});
