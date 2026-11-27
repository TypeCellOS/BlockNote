import { describe, expect, vi } from "vite-plus/test";

import { markdownToHtml } from "../../parsers/markdown/markdownToHtml.js";
import { htmlToMarkdown } from "./htmlToMarkdown.js";

describe("htmlToMarkdown", () => {
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
