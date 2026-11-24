import { describe, expect } from "vite-plus/test";
import { markdownToHtml } from "./markdownToHtml.js";

describe("markdownToHtml", () => {
  // CommonMark: a line ending is "\n", "\r\n" or "\r". A file from Windows
  // has "\r\n".
  it.each([
    ["\\r\\n", "\r\n"],
    ["\\r", "\r"],
  ])("reads %s as a line end", (_, lineEnd) => {
    const lines = [
      "# Heading",
      "",
      "* Bullet",
      "  * Nested bullet",
      "",
      "1. Numbered",
      "",
      "- [x] Checked",
      "",
      "> Quote",
      "",
      "Line one\\",
      "line two",
      "",
      "```js",
      "const a = 1;",
      "```",
      "",
    ];

    expect(markdownToHtml(lines.join(lineEnd))).toBe(
      markdownToHtml(lines.join("\n")),
    );
  });

  // The info string of a backtick code fence cannot contain a backtick
  // (CommonMark). Thus a line that starts with a code span of three backticks
  // is text. The markdown exporter writes such a code span for code that
  // contains two backticks.
  describe("a line that starts with a code span of three backticks", () => {
    it("is a paragraph and not the start of a code block", () => {
      expect(markdownToHtml("```a``b```\n\nnext")).toBe(
        "<p><code>a``b</code></p><p>next</p>",
      );
    });

    it("continues the paragraph before it", () => {
      expect(markdownToHtml("text\n```a``b```")).toMatch(
        /^<p>text<br>\s*<code>a``b<\/code><\/p>$/,
      );
    });

    it("continues the quote before it", () => {
      expect(markdownToHtml("> quote\n```a``b```")).toMatch(
        /^<blockquote><p>quote<br>\s*<code>a``b<\/code><\/p><\/blockquote>$/,
      );
    });
  });
});
