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

  it("preserves Google Docs blank paragraphs but leaves inline breaks alone", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(
      '<b id="docs-internal-guid-test" style="font-weight:normal"><p>First<br>line</p><br><br><p>Last</p></b>',
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
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/html", html);
    clipboardData.setData("text/plain", "Original");
    editor.prosemirrorView.dom.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
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
});
