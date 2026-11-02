import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { plainTextFormat } from "./plainText.js";

const editor = BlockNoteEditor.create();

function block(
  type: string,
  text: string | undefined,
  children: LensBlock[] = [],
): LensBlock {
  return {
    id: "",
    type,
    props: {},
    content:
      text === undefined ? undefined : [{ type: "text", text, styles: {} }],
    children,
  };
}

describe("plainTextFormat.serialize", () => {
  it("joins the text of the blocks with blank lines, in document order", () => {
    const blocks = [
      block("heading", "Title"),
      block("bulletListItem", "Parent", [block("paragraph", "Child")]),
      block("paragraph", "line one\nline two"),
    ];
    expect(plainTextFormat.serialize(editor, blocks)).toBe(
      "Title\n\nParent\n\nChild\n\nline one\nline two",
    );
  });

  it("does not show blocks without text", () => {
    const blocks = [
      block("paragraph", "a"),
      block("image", undefined),
      block("paragraph", ""),
      block("paragraph", "   "),
      block("paragraph", "b"),
    ];
    expect(plainTextFormat.serialize(editor, blocks)).toBe("a\n\nb");
  });
});

describe("plainTextFormat.parse", () => {
  const texts = (text: string) =>
    plainTextFormat.parse(editor, text).map((parsed) => parsed.content);

  it("makes a paragraph from each paragraph of text", () => {
    const [first] = plainTextFormat.parse(editor, "a\n\nb");
    expect(first).toEqual(block("paragraph", "a"));
    expect(texts("a\n\nb")).toEqual([
      [{ type: "text", text: "a", styles: {} }],
      [{ type: "text", text: "b", styles: {} }],
    ]);
  });

  it("keeps single line breaks in a paragraph", () => {
    expect(texts("line one\nline two")).toEqual([
      [{ type: "text", text: "line one\nline two", styles: {} }],
    ]);
  });

  it("uses lines with only spaces as blank lines, and ignores empty paragraphs", () => {
    expect(texts("\n\na\n  \n\n\nb\n")).toEqual([
      [{ type: "text", text: "a", styles: {} }],
      [{ type: "text", text: "b", styles: {} }],
    ]);
  });

  it("accepts Windows line breaks", () => {
    expect(texts("a\r\n\r\nb")).toHaveLength(2);
  });
});
