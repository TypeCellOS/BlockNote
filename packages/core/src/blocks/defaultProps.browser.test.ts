import { describe, expect } from "vite-plus/test";

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)();
    return editor;
  },
);

describe("the HTML parse of colors", () => {
  // HTML from outside BlockNote (or HTML without the `data-` attributes)
  // gives a theme color only as its CSS value. Before the fix, the parse
  // gave that CSS value as the color (for example "rgb(153, 74, 55)"), and
  // the editor showed no color: it shows only the theme colors by name.
  it("reads a theme color of a block that the HTML gives only as a style as its name", ({
    editor,
  }) => {
    expect(
      editor.tryParseHTMLToBlocks(
        '<p style="color: #994a37; background-color: #cfedff">Hello</p>',
      ),
    ).toMatchObject([{ props: { textColor: "red", backgroundColor: "blue" } }]);
  });

  it("reads a theme color of text that the HTML gives only as a style as its name", ({
    editor,
  }) => {
    expect(
      editor.tryParseHTMLToBlocks(
        '<p><span style="color: #48722d">Hello</span> <span style="background-color: #f0e8cb">you</span></p>',
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

  it("keeps a CSS color that is not a theme color", ({ editor }) => {
    expect(
      editor.tryParseHTMLToBlocks('<p style="color: rgb(1, 2, 3)">Hello</p>'),
    ).toMatchObject([{ props: { textColor: "rgb(1, 2, 3)" } }]);
  });
});
