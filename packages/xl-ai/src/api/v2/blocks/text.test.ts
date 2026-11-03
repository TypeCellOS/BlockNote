import { describe, expect, it } from "vite-plus/test";

import { blockToText, inlineContentToText } from "./text.js";
import type {
  LensBlock,
  LensInlineContent,
  LensTableContent,
} from "./types.js";

const styled = (text: string) => ({ type: "text" as const, text, styles: {} });

describe("inlineContentToText", () => {
  it("joins the text of text, links and custom inline content", () => {
    const content: LensInlineContent[] = [
      styled("a "),
      { type: "link", href: "https://example.com", content: [styled("link")] },
      { type: "tag", props: {}, content: [styled(" tag")] },
      { type: "math", props: {}, content: " x^2" },
      { type: "mention", props: { user: "Ada" } },
    ];
    expect(inlineContentToText(content)).toBe("a link tag x^2");
  });
});

const table: LensTableContent = {
  type: "tableContent",
  columnWidths: [undefined, undefined],
  rows: [
    { cells: [[styled("A")], [styled("B")]] },
    {
      cells: [
        { type: "tableCell", props: {}, content: [styled("c")] },
        { type: "tableCell", props: {}, content: [styled("d")] },
      ],
    },
  ],
};

describe("blockToText", () => {
  function block(content: LensBlock["content"]): LensBlock {
    return { id: "a", type: "x", props: {}, content, children: [] };
  }

  it("returns the text of inline content", () => {
    expect(blockToText(block([styled("hello")]))).toBe("hello");
  });

  it("returns the text of table cells in the two forms, one row on each line", () => {
    expect(blockToText(block(table))).toBe("A B\nc d");
  });

  it("returns no text for a block without content", () => {
    expect(blockToText(block(undefined))).toBe("");
  });
});
