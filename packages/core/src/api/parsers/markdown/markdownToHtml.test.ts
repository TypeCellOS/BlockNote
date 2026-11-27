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

  it.each([
    [
      '[link](<my file> "some ) title")',
      '<p><a href="my file" title="some ) title">link</a></p>',
    ],
    [
      '[link](my-file "some ) title")',
      '<p><a href="my-file" title="some ) title">link</a></p>',
    ],
    ["[link](<a<b)c>)", '<p><a href="a&lt;b)c">link</a></p>'],
    [
      "![Photo](<photo.png)\nTaken by Alice >)",
      '<p><img src="photo.png" alt="Photo"><br>Taken by Alice &gt;)</p>',
    ],
    [
      String.raw`![Photo](\\server\share\photo.png)`,
      String.raw`<p><img src="\\server\share\photo.png" alt="Photo"></p>`,
    ],
    [
      String.raw`![Photo](C:\photos\_old\photo.png)`,
      String.raw`<p><img src="C:\photos\_old\photo.png" alt="Photo"></p>`,
    ],
    [
      String.raw`![Photo](family\(2026\).png)`,
      '<p><img src="family(2026).png" alt="Photo"></p>',
    ],
    [
      "*[a](<some` url>)* `b`",
      '<p><em><a href="some` url">a</a></em> <code>b</code></p>',
    ],
    [
      '*<span title="`">a</span>* `b`',
      '<p><em><span title="`">a</span></em> <code>b</code></p>',
    ],
    [
      "*<https://e.test/a`b>* `c`",
      '<p><em><a href="https://e.test/a`b">https://e.test/a`b</a></em> <code>c</code></p>',
    ],
    [
      "> # H\n```x```",
      "<blockquote><h1>H</h1></blockquote><p><code>x</code></p>",
    ],
    ["> A\nB\n> C", "<blockquote><p>A<br>B<br>C</p></blockquote>"],
    ["> - A\nB", "<blockquote><ul><li><p>A<br>B</p></li></ul></blockquote>"],
    [
      "> > - A\nB",
      "<blockquote><blockquote><ul><li><p>A<br>B</p></li></ul></blockquote></blockquote>",
    ],
    [
      "> - A\n>   # H\nB",
      "<blockquote><ul><li><p>A</p><h1>H</h1></li></ul></blockquote><p>B</p>",
    ],
    [
      "> - A\n>\nB",
      "<blockquote><ul><li><p>A</p></li></ul></blockquote><p>B</p>",
    ],
    [
      "> > A\nB\n> > C\nD",
      "<blockquote><blockquote><p>A<br>B<br>C<br>D</p></blockquote></blockquote>",
    ],
    [
      "> A\nB\n> # H\nOutside",
      "<blockquote><p>A<br>B</p><h1>H</h1></blockquote><p>Outside</p>",
    ],
    [
      "```x``` is inline\n\n```js\nhello\n```",
      '<p><code>x</code> is inline</p><pre><code data-language="js">hello</code></pre>',
    ],
  ])("keeps the token and container boundaries in %j", (markdown, html) => {
    expect(markdownToHtml(markdown)).toBe(html);
  });

  it("recovers a legacy fence with backticks in its info string only if it has a compatible closer", () => {
    expect(markdownToHtml("````js`meta\nhello\n````")).toBe(
      '<pre><code data-language="js`meta">hello</code></pre>',
    );
    expect(markdownToHtml("````js`meta\nhello\n```")).toBe(
      "<p>````js`meta<br>hello</p><pre><code></code></pre>",
    );
  });

  it.each([
    ["[link](<my file).pdf>)", "my file).pdf"],
    ["[link](<my file\\>v.pdf>)", "my file&gt;v.pdf"],
  ])("reads the full destination in %s", (markdown, href) => {
    expect(markdownToHtml(markdown)).toBe(`<p><a href="${href}">link</a></p>`);
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
