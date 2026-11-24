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
});
