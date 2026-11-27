import { describe, expect, vi } from "vite-plus/test";

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

  it.each([
    String.raw`foo\ bar.png`,
    String.raw`\\server\share\my photo.png`,
    "my file).png",
    "my file&gt;v.png",
  ])("round-trips an image pointing to %s", (src) => {
    const image = `<p><img src="${src}" alt="Photo"></p>`;
    expect(markdownToHtml(htmlToMarkdown(image))).toBe(image);
  });

  // In the active document, an element of the HTML can load a resource and
  // run an event handler: each video of an export starts a second request.
  it("keeps the HTML out of the active document", ({ onTestFinished }) => {
    // The code must make no element in the active document: a node that
    // goes into such an element is in the active document from then on.
    const createElement = vi.spyOn(document, "createElement");
    onTestFinished(() => {
      createElement.mockRestore();
    });

    const markdown = htmlToMarkdown(
      `<p>Text</p><video src="video.mp4"></video>`,
    );

    expect(markdown).toBe("Text\n\n![](video.mp4)\n");
    expect(createElement).not.toHaveBeenCalled();
  });
});
