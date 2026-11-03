import { describe, expect, it } from "vite-plus/test";

import { blockToText } from "./blocks/text.js";
import type { LensBlock } from "./blocks/types.js";

import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocumentFromText,
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
    valid(updateDocumentFromText(editor, { format: markdownFormat, text }));

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
    valid(updateDocumentFromText(editor, { format: markdownFormat, text }));

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
    valid(updateDocumentFromText(editor, { format: markdownFormat, text }));

    expect(editor.getBlock("hard-break")).toBeUndefined();
    expect(editor.getBlock("empty-1")).toBeDefined();
    expect(editor.getBlock("empty-2")).toBeDefined();
  });

  it("a removed paragraph removes its colors with it", () => {
    const editor = createEditor();
    const text = replaceOnce(
      getDocumentText(editor, plainTextFormat),
      "Colored centered paragraph\n\n",
      "",
    );
    const update = valid(
      updateDocumentFromText(editor, {
        format: plainTextFormat,
        text,
      }),
    );

    expect(update.operations).toEqual([{ type: "delete", id: "colored" }]);
  });

  it("empty text removes all blocks that the format shows", () => {
    const editor = createEditor();
    valid(updateDocumentFromText(editor, { format: markdownFormat, text: "" }));

    // The document always has one block. An empty paragraph is a <br> line.
    expect(getDocumentText(editor, markdownFormat)).toBe("<br>\n");
    for (const id of ["colored", "table", "image", "last"]) {
      expect(editor.getBlock(id)).toBeUndefined();
    }
    // The empty text gives one empty paragraph. It matches the empty
    // paragraph "empty-1", thus that block stays as the only block.
    expect(editor.document.map((block) => block.id)).toEqual(["empty-1"]);
  });

  it("keeps a block that renders as more than one paragraph if the text of a paragraph changes", () => {
    const editor = createEditor([
      {
        id: "code",
        type: "codeBlock",
        props: { language: "javascript" },
        content: "const a = 1;\n\nconst b = 2;",
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const text = replaceOnce(
      getDocumentText(editor, plainTextFormat),
      "const b = 2;",
      "const b = 3;",
    );
    const update = valid(
      updateDocumentFromText(editor, { format: plainTextFormat, text }),
    );

    // The parts join again, with the blank line between them.
    expect(update.warnings).toEqual([]);
    expect(editor.getBlock("code")).toMatchObject({
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ text: "const a = 1;\n\nconst b = 3;" }],
    });
    expect(getDocumentText(editor, plainTextFormat)).toBe(text);
  });

  it("replaces a block that renders as more than one paragraph if the text moves a paragraph", () => {
    const editor = createEditor([
      {
        id: "code",
        type: "codeBlock",
        props: { language: "javascript" },
        content: "const a = 1;\n\nconst b = 2;",
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const text = "const b = 2;\n\nconst a = 1;\n\nAfter";
    const update = valid(
      updateDocumentFromText(editor, { format: plainTextFormat, text }),
    );

    expect(update.warnings).toEqual([
      { type: "multi-part-block-replaced", id: "code" },
    ]);
    expect(editor.getBlock("code")).toBeUndefined();
    expect(getDocumentText(editor, plainTextFormat)).toBe(text);
  });

  it("a changed block that the format shows with content of a different shape becomes a block of the text", () => {
    // A format that shows each block as one paragraph of text, also a table.
    const textOnly: TextFormat = {
      serialize: (_editor, blocks) => blocks.map(blockToText).join("\n\n"),
      parse: (_editor, text) =>
        text.split("\n\n").map((line): LensBlock => ({
          id: "",
          type: "paragraph",
          props: {},
          content: [{ type: "text", text: line, styles: {} }],
          children: [],
        })),
    };
    const editor = createEditor([
      {
        id: "table",
        type: "table",
        content: { type: "tableContent", rows: [{ cells: ["Alpha", "Beta"] }] },
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const text = getDocumentText(editor, textOnly);

    const update = valid(
      updateDocumentFromText(editor, {
        format: textOnly,
        text: text.replace("Beta", "Gamma"),
      }),
    );

    expect(update.warnings).toEqual([
      { type: "block-shape-replaced", id: "table" },
    ]);
    expect(editor.getBlock("table")).toMatchObject({ type: "paragraph" });
    expect(getDocumentText(editor, textOnly)).toBe(
      text.replace("Beta", "Gamma"),
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

      valid(updateDocumentFromText(editor, { format: plainTextFormat, text }));

      expect(editor.getBlock("hidden")).toBeDefined();
    },
  );
});
