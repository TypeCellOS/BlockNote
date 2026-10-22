import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { defaultHTMLPreprocessor } from "./preprocessHTML.js";

// These tests exercise browser HTML parsing and native clipboard events.
const editors: BlockNoteEditor[] = [];
const containers: HTMLElement[] = [];

function createEditor(
  options: Parameters<typeof BlockNoteEditor.create>[0] = {},
) {
  const editor = BlockNoteEditor.create(options);
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
  for (const container of containers.splice(0)) {
    container.remove();
  }
});

function wordItem(text: string, level = 1, marker = "·", list = "l0") {
  return `<p style="mso-list: ${list} level${level} lfo1"><span style="mso-list:Ignore">${marker}&nbsp;</span>${text}<o:p></o:p></p>`;
}

function createPasteEvent(data: Record<string, string>) {
  const event = new ClipboardEvent("paste", {
    clipboardData: new DataTransfer(),
    bubbles: true,
    cancelable: true,
  });
  if (!event.clipboardData) {
    throw new Error(
      "Synthetic paste events must provide a clipboard data store",
    );
  }
  // Firefox creates its own store rather than retaining the constructor's store.
  for (const [type, value] of Object.entries(data)) {
    event.clipboardData.setData(type, value);
    expect(event.clipboardData.getData(type)).toBe(value);
  }
  return event;
}

describe("Office HTML parsing", () => {
  it("reconstructs Word lists, retaining formatting and nesting", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      wordItem("<strong>First</strong>").replace(
        'style="mso-list:',
        'style="text-align:center;mso-list:',
      ) +
        wordItem("Nested", 2, "3.") +
        wordItem("Second"),
    );
    expect(blocks).toMatchObject([
      {
        type: "bulletListItem",
        props: { textAlignment: "center" },
        content: [{ text: "First", styles: { bold: true } }],
        children: [
          {
            type: "numberedListItem",
            props: { start: 3 },
            content: [{ text: "Nested" }],
          },
        ],
      },
      { type: "bulletListItem", content: [{ text: "Second" }], children: [] },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("separates Word lists across paragraphs, list IDs and marker types", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      wordItem("One", 1, "4.") +
        "<p>Between</p>" +
        wordItem("Two", 1, "7.") +
        wordItem("Bullet") +
        wordItem("New list", 1, "2.", "l1") +
        wordItem("Another list", 1, "8.", "l2"),
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "numberedListItem",
      "paragraph",
      "numberedListItem",
      "bulletListItem",
      "numberedListItem",
      "numberedListItem",
    ]);
    expect(blocks[0].props).toMatchObject({ start: 4 });
    expect(blocks[2].props).toMatchObject({ start: 7 });
    expect(blocks[4].props).toMatchObject({ start: 2 });
    expect(blocks[5].props).toMatchObject({ start: 8 });
  });

  it("removes Word paragraph-end placeholders without removing empty paragraphs", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      '<meta name="ProgId" content="Word.Document"><p>Text<o:p>&nbsp;</o:p></p><p><span lang="en"><o:p>&nbsp;</o:p></span></p>',
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "Text" }] },
      { type: "paragraph", content: [] },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("preserves the start of a numbered item that has nested children", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      wordItem("Parent", 1, "4.") +
        wordItem("Child", 2, "3.") +
        wordItem("Next", 1, "5."),
    );
    expect(blocks).toMatchObject([
      {
        type: "numberedListItem",
        props: { start: 4 },
        children: [{ type: "numberedListItem", props: { start: 3 } }],
      },
      { type: "numberedListItem" },
    ]);
    expect(blocks[1].props).not.toHaveProperty("start");
  });

  it("preserves numbering gaps and restarts through HTML round trips", () => {
    const editor = createEditor();
    const blocks = editor.tryParseHTMLToBlocks(
      wordItem("First", 1, "4.") +
        wordItem("Gap", 1, "7.") +
        wordItem("Next", 1, "8.") +
        wordItem("Restart", 1, "1.", "l1") +
        wordItem("Last", 1, "2.", "l1"),
    );
    expect(
      blocks.map((block) =>
        block.type === "numberedListItem" ? block.props.start : undefined,
      ),
    ).toEqual([4, 7, undefined, 1, undefined]);
    for (const html of [
      editor.blocksToHTMLLossy(blocks),
      editor.blocksToFullHTML(blocks),
    ]) {
      expect(
        editor.tryParseHTMLToBlocks(html).map((block) => block.props),
      ).toEqual(blocks.map((block) => block.props));
    }
    const root = document.createElement("div");
    root.innerHTML = editor.blocksToFullHTML(blocks);
    expect(
      Array.from(
        root.querySelectorAll('[data-content-type="numberedListItem"]'),
        (item) => item.getAttribute("data-index"),
      ),
    ).toEqual(["4", "7", "8", "1", "2"]);
  });

  it("recognizes parenthesized numbers and retains unsupported Word labels", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      wordItem("Number", 1, "(3)") +
        wordItem("Multilevel", 1, "1.2.") +
        wordItem("Unknown", 1, "Section A:"),
    );
    expect(blocks).toMatchObject([
      {
        type: "numberedListItem",
        props: { start: 3 },
        content: [{ text: "Number" }],
      },
      { type: "paragraph", content: [{ text: "1.2.\u00a0Multilevel" }] },
      { type: "paragraph", content: [{ text: "Section A:\u00a0Unknown" }] },
    ]);
  });

  it("preserves Google Docs blank paragraphs but leaves inline breaks alone", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      '<b id="docs-internal-guid-test" style="font-weight:normal"><p>First<br>line</p>\n<!-- gap --><br>\n<br><!-- gap -->\n<p>Last</p></b>',
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "First\nline", styles: {} }] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [{ text: "Last", styles: {} }] },
    ]);
    expect(blocks).toHaveLength(4);
  });

  it("can disable the built-in normalization", () => {
    const blocks = createEditor({ preprocessHTML: false }).tryParseHTMLToBlocks(
      wordItem("Unchanged"),
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "·\u00a0Unchanged" }] },
    ]);
  });

  it.each([
    ["First<br>Last", "First\nLast"],
    ["<span>First</span><br><span>Last</span>", "First\nLast"],
    ["First \n<br>\n Last", "First \nLast"],
  ])(
    "keeps hard breaks in Google Docs inline fragments: %s",
    (fragment, text) => {
      const blocks = createEditor().tryParseHTMLToBlocks(
        `<b id="docs-internal-guid-test" style="font-weight:normal">${fragment}</b>`,
      );
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: "paragraph",
        content: [{ text }],
      });
    },
  );

  it("leaves unrelated HTML unchanged", () => {
    const html = "<div><p>Original</p><br><p>Last</p></div>";
    expect(defaultHTMLPreprocessor(html)).toBe(html);
  });

  it("can replace the built-in normalization", () => {
    const preprocessHTML = vi.fn(() => "<h2>Replacement</h2>");
    const html = wordItem("Original");
    const blocks = createEditor({ preprocessHTML }).tryParseHTMLToBlocks(html);
    expect(preprocessHTML).toHaveBeenCalledExactlyOnceWith(html);
    expect(blocks).toMatchObject([
      {
        type: "heading",
        props: { level: 2 },
        content: [{ text: "Replacement" }],
      },
    ]);
  });

  it("can extend the built-in normalization", () => {
    const editor = createEditor({
      preprocessHTML(html) {
        return defaultHTMLPreprocessor(html).replace("Original", "Changed");
      },
    });
    expect(editor.tryParseHTMLToBlocks(wordItem("Original"))).toMatchObject([
      { type: "bulletListItem", content: [{ text: "Changed" }] },
    ]);
  });

  it("uses the same preprocessing for clipboard HTML", () => {
    const preprocessHTML = vi.fn((html: string) =>
      defaultHTMLPreprocessor(html).replace("Original", "Changed"),
    );
    const editor = createEditor({ preprocessHTML });
    const container = document.createElement("div");
    document.body.append(container);
    containers.push(container);
    editor.mount(container);
    const html = wordItem("Original");
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({ "text/html": html, "text/plain": "Original" }),
    );
    expect(preprocessHTML).toHaveBeenCalledExactlyOnceWith(html);
    expect(editor.document[0]).toMatchObject({
      type: "bulletListItem",
      content: [{ text: "Changed" }],
    });
  });

  it("does not preprocess raw HTML pastes", () => {
    const preprocessHTML = vi.fn(() => "<p>Changed</p>");
    const editor = createEditor({ preprocessHTML });
    const container = document.createElement("div");
    document.body.append(container);
    containers.push(container);
    editor.mount(container);
    editor.pasteHTML("<p>Original</p>", true);
    expect(preprocessHTML).not.toHaveBeenCalled();
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "Original" }],
    });
  });

  it("does not preprocess internal BlockNote clipboard HTML", () => {
    const preprocessHTML = vi.fn(() => "<p>Changed</p>");
    const editor = createEditor({ preprocessHTML });
    const container = document.createElement("div");
    document.body.append(container);
    containers.push(container);
    editor.mount(container);
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({
        "blocknote/html": editor.blocksToFullHTML([
          { type: "paragraph", content: "Original" },
        ]),
        "text/html": "<p>Fallback</p>",
      }),
    );
    expect(preprocessHTML).not.toHaveBeenCalled();
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "Original" }],
    });
  });
});
