import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

describe("the HTML parse of colors", () => {
  const editor = BlockNoteEditor.create();

  // HTML from outside BlockNote (or HTML without the `data-` attributes)
  // gives a theme color only as its CSS value. Before the fix, the parse
  // gave that CSS value as the color (for example "rgb(224, 62, 62)"), and
  // the editor showed no color: it shows only the theme colors by name.
  it("reads a theme color of a block that the HTML gives only as a style as its name", () => {
    expect(
      editor.tryParseHTMLToBlocks(
        '<p style="color: #e03e3e; background-color: #ddebf1">Hello</p>',
      ),
    ).toMatchObject([{ props: { textColor: "red", backgroundColor: "blue" } }]);
  });

  it("reads a theme color of text that the HTML gives only as a style as its name", () => {
    expect(
      editor.tryParseHTMLToBlocks(
        '<p><span style="color: #4d6461">Hello</span> <span style="background-color: #fbf3db">you</span></p>',
      ),
    ).toMatchObject([
      {
        content: [
          { text: "Hello", styles: { textColor: "green" } },
          { text: " " },
          { text: "you", styles: { backgroundColor: "yellow" } },
        ],
      },
    ]);
  });

  it("keeps a CSS color that is not a theme color", () => {
    expect(
      editor.tryParseHTMLToBlocks('<p style="color: rgb(1, 2, 3)">Hello</p>'),
    ).toMatchObject([{ props: { textColor: "rgb(1, 2, 3)" } }]);
  });
});
