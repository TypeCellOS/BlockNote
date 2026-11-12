import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  updateDocument,
} from "./index.js";
import {
  createEditor,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

/**
 * If a client removes text, the lens removes the blocks that gave that text.
 * It also removes the data that the format does not show: props, hidden
 * children, and empty blocks around them. This is correct, but in these cases
 * content is lost. Thus, examine the expected results carefully.
 */
describe("removals (review closely)", () => {
  it("a removed list item moves out its children and keeps them", () => {
    const editor = createEditor();
    const text = replaceOnce(
      getDocumentText(editor, markdownFormat),
      "* Parent bullet\n  * Child bullet",
      "* Child bullet",
    );
    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );

    expect(editor.getBlock("bullet")).toBeUndefined();
    // The indented paragraph after the bullet is a child of the bullet in
    // the markdown.
    expect(documentShape(editor.document).slice(0, 4)).toEqual([
      "colored",
      "heading",
      "child-bullet",
      ["child-paragraph"],
    ]);
  });

  it("removes empty paragraphs if the blocks around them are removed", () => {
    const editor = createEditor();
    const markdown = getDocumentText(editor, markdownFormat);
    const start = markdown.indexOf("<figure>");
    const end = markdown.indexOf("line two") + "line two".length;
    const text = markdown.slice(0, start) + markdown.slice(end + 2);
    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );

    // The image, the paragraph with the line break, and the two empty
    // paragraphs between them.
    for (const id of ["image", "empty-1", "empty-2", "hard-break"]) {
      expect(editor.getBlock(id)).toBeUndefined();
    }
    expect(editor.getBlock("code")).toBeDefined();
    expect(editor.getBlock("divider")).toBeDefined();
  });

  it("keeps empty paragraphs if only one block next to them is removed", () => {
    const editor = createEditor();
    const text = replaceOnce(
      getDocumentText(editor, markdownFormat),
      "line one\\\nline two\n\n",
      "",
    );
    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );

    expect(editor.getBlock("hard-break")).toBeUndefined();
    expect(editor.getBlock("empty-1")).toBeDefined();
    expect(editor.getBlock("empty-2")).toBeDefined();
  });

  it("removes an empty paragraph that the format does not show if the blocks around it are removed (plain text)", () => {
    // Plain text does not show an empty paragraph. Thus, the text cannot
    // remove it: it is an invisible block, and it stays. The exception: it
    // goes if the write removes the visible blocks on its two sides. Else
    // it would stay alone in place of the removed section.
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "empty", type: "paragraph" },
      { id: "b", type: "paragraph", content: "Beta" },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text: "End\n",
      }),
    );

    expect(documentShape(editor.document)).toEqual(["end"]);
  });

  it("a removed paragraph removes its colors with it", () => {
    const editor = createEditor();
    const text = replaceOnce(
      getDocumentText(editor, plainTextFormat),
      "Colored centered paragraph\n\n",
      "",
    );
    const update = valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );

    expect(update.operations).toEqual([{ type: "delete", id: "colored" }]);
  });

  it("empty text removes all blocks that the format shows", () => {
    const editor = createEditor();
    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text: "",
      }),
    );

    // The document always has one block. An empty paragraph is a <br> line.
    expect(getDocumentText(editor, markdownFormat)).toBe("<br>\n");
    for (const id of ["colored", "table", "image", "last"]) {
      expect(editor.getBlock(id)).toBeUndefined();
    }
    // The empty text gives one empty paragraph. It matches the empty
    // paragraph "empty-1", thus that block stays as the only block.
    expect(editor.document.map((block) => block.id)).toEqual(["empty-1"]);
  });

  it("a changed block that the format shows with content of a different shape becomes a block of the text", () => {
    // Markdown shows a file block without a caption as a paragraph with a
    // link (a file block with a caption is one figure). A change of the link
    // text changes that paragraph: the block becomes a paragraph, and its
    // props (the URL and the name) are lost.
    const editor = createEditor([
      {
        id: "file",
        type: "file",
        props: { url: "https://example.com/doc.pdf", name: "doc.pdf" },
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const text = getDocumentText(editor, markdownFormat);
    expect(text).toContain("[doc.pdf](https://example.com/doc.pdf)");

    const update = valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text: text.replace("[doc.pdf]", "[report.pdf]"),
      }),
    );

    expect(update.warnings).toEqual([
      { type: "block-shape-replaced", id: "file" },
    ]);
    expect(editor.getBlock("file")).toMatchObject({ type: "paragraph" });
    expect(getDocumentText(editor, markdownFormat)).toBe(
      text.replace("[doc.pdf]", "[report.pdf]"),
    );
  });

  it.each([
    [
      "after the removed block",
      [
        { id: "intro", type: "paragraph" as const, content: "Intro" },
        { id: "end", type: "paragraph" as const, content: "Conclusion" },
        { id: "hidden", type: "divider" as const },
      ],
      "Intro",
    ],
    [
      "before the removed block",
      [
        { id: "hidden", type: "divider" as const },
        { id: "first", type: "paragraph" as const, content: "First" },
        { id: "second", type: "paragraph" as const, content: "Second" },
      ],
      "Second",
    ],
    [
      "between two removed blocks",
      [
        { id: "first", type: "paragraph" as const, content: "First" },
        { id: "a", type: "paragraph" as const, content: "A" },
        { id: "hidden", type: "divider" as const },
        { id: "b", type: "paragraph" as const, content: "B" },
      ],
      "First",
    ],
  ])(
    "keeps a hidden block with data %s (plain text does not show a divider)",
    (_, document, text) => {
      const editor = createEditor(document);
      expect(getDocumentText(editor, plainTextFormat)).not.toContain("---");

      valid(
        updateDocument(editor, {
          base: "current",
          format: plainTextFormat,
          text,
        }),
      );

      expect(editor.getBlock("hidden")).toBeDefined();
    },
  );
});
