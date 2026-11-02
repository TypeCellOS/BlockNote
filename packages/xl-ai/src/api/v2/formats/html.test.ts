import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { htmlFormat } from "./html.js";

describe("htmlFormat", () => {
  const editor = BlockNoteEditor.create();

  it("shows the props and styles that HTML can show", () => {
    const html = htmlFormat.serialize(editor, [
      {
        id: "p",
        type: "paragraph",
        props: { textColor: "red" },
        content: [{ type: "text", text: "Hello", styles: { underline: true } }],
        children: [],
      },
    ]);
    expect(html).toContain('data-text-color="red"');
    expect(html).toContain("<u>Hello</u>");
  });

  it("parses them back", () => {
    const [block] = htmlFormat.parse(
      editor,
      '<p data-text-color="red"><u>Hello</u></p>',
    );
    expect(block).toMatchObject({
      type: "paragraph",
      props: { textColor: "red" },
      content: [{ type: "text", text: "Hello", styles: { underline: true } }],
    });
  });
});
