import { describe, expect } from "vite-plus/test";
import { markdownToHtml } from "../../parsers/markdown/markdownToHtml.js";
import { htmlToMarkdown } from "./htmlToMarkdown.js";

describe("htmlToMarkdown", () => {
  // A hard break in a heading or a list item is a `<br>` tag. A backslash
  // directly before the tag would escape its `<`.
  it.each(["<h1>a\\<br>b</h1>", "<ul><li><p>a\\<br>b</p></li></ul>"])(
    "keeps a backslash directly before a hard break in %s",
    (html) => {
      expect(markdownToHtml(htmlToMarkdown(html))).toBe(html);
    },
  );

  // The markdown parser reads a line without this indent as a new paragraph
  // after the list. BlockNote blocks give this HTML only for a toggle list
  // item (the paragraph is then in a `details` element), so this test uses
  // HTML.
  it("indents the lines after a hard break in a paragraph of a list item", () => {
    expect(htmlToMarkdown("<ul><li><p>a</p><p>b<br>c</p></li></ul>")).toBe(
      "* a\n\n  b\\\n  c\n",
    );
  });
});
