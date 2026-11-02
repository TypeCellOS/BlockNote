import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./api.js";
import {
  createEditor,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";

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
    updateDocumentFromText(editor, { format: markdownFormat, text });

    expect(editor.getBlock("bullet")).toBeUndefined();
    expect(documentShape(editor.document).slice(0, 4)).toEqual([
      "colored",
      "heading",
      "child-bullet",
      "child-paragraph",
    ]);
  });

  it("removes empty paragraphs if the blocks around them are removed", () => {
    const editor = createEditor();
    const markdown = getDocumentText(editor, markdownFormat);
    const start = markdown.indexOf("<figure>");
    const end = markdown.indexOf("line two") + "line two".length;
    const text = markdown.slice(0, start) + markdown.slice(end + 2);
    updateDocumentFromText(editor, { format: markdownFormat, text });

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
    updateDocumentFromText(editor, { format: markdownFormat, text });

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
    const update = updateDocumentFromText(editor, {
      format: plainTextFormat,
      text,
    });

    expect(update.operations).toEqual([{ type: "delete", id: "colored" }]);
  });

  it("empty text removes all blocks that the format shows", () => {
    const editor = createEditor();
    updateDocumentFromText(editor, { format: markdownFormat, text: "" });

    expect(getDocumentText(editor, markdownFormat)).toBe("\n");
    for (const id of ["colored", "table", "image", "empty-1", "last"]) {
      expect(editor.getBlock(id)).toBeUndefined();
    }
  });

  it("replaces a block that renders as more than one paragraph if one paragraph changes", () => {
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
    const update = updateDocumentFromText(editor, {
      format: plainTextFormat,
      text,
    });

    expect(update.warnings).toEqual([
      { type: "multi-part-block-replaced", id: "code" },
    ]);
    expect(editor.getBlock("code")).toBeUndefined();
    expect(getDocumentText(editor, plainTextFormat)).toBe(text);
  });
});
