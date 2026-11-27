import { describe, expect } from "vite-plus/test";
import { markdownToHtml } from "./markdownToHtml.js";

describe("markdownToHtml", () => {
  it("keeps an unmatched backtick run literal", () => {
    expect(markdownToHtml("``a`")).toBe("<p>``a`</p>");
  });

  it("unescapes ASCII punctuation in a link destination", () => {
    expect(markdownToHtml(String.raw`[x](https://example.com/a\?q\=1)`)).toBe(
      '<p><a href="https://example.com/a?q=1">x</a></p>',
    );
  });

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

  // A paragraph line after the first can have any indent, and the indent is
  // not a part of the text. But a code span has its text as it is: only the
  // line end becomes a space (CommonMark).
  describe("the indent of a paragraph line after the first", () => {
    it.each([
      ["a line end alone", "aaa\n      bbb\n\tccc"],
      ["a backslash", "aaa\\\n      bbb\\\n\tccc"],
      ["two spaces", "aaa  \n      bbb  \n\tccc"],
    ])("is removed after a line break from %s", (_, markdown) => {
      expect(markdownToHtml(markdown)).toBe("<p>aaa<br>bbb<br>ccc</p>");
    });

    it.each([
      ["a tab", "`foo\n\tbar`", "<p><code>foo \tbar</code></p>"],
      ["spaces", "`foo\n      bar`", "<p><code>foo       bar</code></p>"],
    ])("stays in a code span, for %s", (_, markdown, html) => {
      expect(markdownToHtml(markdown)).toBe(html);
    });
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
