import { describe, expect } from "vite-plus/test";
import * as Y from "yjs";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { blocksToYDoc, withCollaboration } from "../../../yjs/index.js";
import { isAllowedUri } from "./link.js";
import { getLinksInDocument } from "./linkTestHelpers.js";

const url = "https://example.com";
const customLinkOptions = {
  isValidLink: (href: string) =>
    isAllowedUri(href) || href.startsWith("myapp:"),
};

describe("Link extension with y-prosemirror", () => {
  const it = globalThis.it.extend<{
    collaboration: { doc: Y.Doc; editor: BlockNoteEditor };
  }>({
    collaboration: async ({ onTestFinished, setupEditor }, use) => {
      const doc = new Y.Doc();
      onTestFinished(() => doc.destroy());
      const { editor } = await setupEditor({
        mountType: "dom",
        ...withCollaboration({
          extensions: [],
          collaboration: {
            fragment: doc.getXmlFragment("doc"),
            user: { name: "Test", color: "red" },
          },
        }),
      });
      await use({ doc, editor });
    },
  });

  it("autolinks a URL typed locally", ({ collaboration: { editor } }) => {
    editor.replaceBlocks(editor.document, [{ id: "typed", type: "paragraph" }]);
    editor.setTextCursorPosition("typed", "end");

    editor.transact((tr) => tr.insertText("example.com"));
    editor.transact((tr) => tr.insertText(" "));

    expect(
      getLinksInDocument(editor).map(({ href, text }) => ({ href, text })),
    ).toEqual([{ href: "https://example.com", text: "example.com" }]);
  });

  it("does not autolink text that arrives from another client", ({
    collaboration: { doc, editor },
    onTestFinished,
  }) => {
    const remoteDoc = blocksToYDoc(
      editor,
      [
        { type: "paragraph", content: "Visit example.com" },
        { type: "paragraph", content: "Second block" },
      ],
      "doc",
    );
    onTestFinished(() => remoteDoc.destroy());

    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc));

    expect(editor.document.map((block) => block.content)).toEqual([
      [{ type: "text", text: "Visit example.com", styles: {} }],
      [{ type: "text", text: "Second block", styles: {} }],
    ]);
  });
});

describe("Link extension paste handler behavior", () => {
  it("applies a link to the existing selected text when pasting a URL", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [{ type: "paragraph", content: "click here" }],
    });
    selectText(editor, "click here");

    editor.pasteText("https://example.com");

    expect(editor.document[0].content).toEqual([
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "click here", styles: {} }],
      },
    ]);
  });

  it("replaces the selection normally when the pasted text is not a URL", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [{ type: "paragraph", content: "click here" }],
    });
    selectText(editor, "click here");

    editor.pasteText("not a url");

    expect(editor.document[0].content).toEqual([
      { type: "text", text: "not a url", styles: {} },
    ]);
  });
});

describe("Link extension isValidLink option", () => {
  const text = { type: "text", text: url, styles: {} };
  it.for([
    {
      name: "links by default",
      links: undefined,
      expected: [{ type: "link", href: url, content: [text] }],
    },
    {
      name: "inserts plain text when validation rejects it",
      links: { isValidLink: () => false },
      expected: [text],
    },
  ])("paste rule $name", async ({ links, expected }, { setupEditor }) => {
    const { editor } = await setupEditor({ mountType: "dom", links });

    // No selection or trailing space: neither paste-over-selection nor
    // typing autolink can create the mark.
    editor.pasteText(url);

    expect(editor.document[0].content).toEqual(expected);
  });

  it("paste-handler: restrictive override blocks URL pasted over selection", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      links: { isValidLink: () => false },
      initialContent: [{ type: "paragraph", content: "click here" }],
    });
    selectText(editor, "click here");

    editor.pasteText("https://example.com");

    expect(editor.document[0].content).toEqual([
      { type: "text", text: "https://example.com", styles: {} },
    ]);
  });

  it("parseHTML: permissive override accepts custom-scheme links", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      links: customLinkOptions,
    });

    const [block] = editor.tryParseHTMLToBlocks(
      '<p><a href="myapp://foo">click</a></p>',
    );

    expect(block.content).toEqual([
      {
        type: "link",
        href: "myapp://foo",
        content: [{ type: "text", text: "click", styles: {} }],
      },
    ]);
  });

  it("parseHTML: default rejects unknown-scheme links", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const [block] = editor.tryParseHTMLToBlocks(
      '<p><a href="myapp://foo">click</a></p>',
    );

    expect(block.content).toEqual([
      { type: "text", text: "click", styles: {} },
    ]);
  });

  it("renderHTML: permissive override preserves custom-scheme href on export", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      links: customLinkOptions,
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "link", href: "myapp://foo", content: "click" }],
        },
      ],
    });

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('href="myapp://foo"');
  });
});
