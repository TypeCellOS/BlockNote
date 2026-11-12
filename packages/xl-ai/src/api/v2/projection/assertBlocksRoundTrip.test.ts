import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { updateDocument } from "../api.js";
import { markdownFormat } from "../formats/markdown.js";
import type { TextFormat } from "../formats/types.js";
import { parseText } from "../parse/parseText.js";
import { assertBlocksRoundTrip } from "./assertBlocksRoundTrip.js";
import { projectDocument } from "./projectDocument.js";

/**
 * A markdown format with a bug: for a text with the word "changed", its parse
 * adds an image without a URL, which markdown does not show. The text of the
 * document does not have the word, thus the view does not show the bug (else,
 * the projection throws first, see `projectWithParts`).
 */
const brokenFormat: TextFormat = {
  serialize: (editor, blocks) => markdownFormat.serialize(editor, blocks),
  parse: (editor, text) => [
    ...markdownFormat.parse(editor, text),
    ...(text.includes("changed")
      ? [{ id: "", type: "image", props: {}, content: undefined, children: [] }]
      : []),
  ],
};

describe("assertBlocksRoundTrip", () => {
  function setup() {
    const editor = BlockNoteEditor.create({
      initialContent: [{ id: "p", type: "paragraph", content: "Hello" }],
    });
    const { view } = projectDocument(editor, markdownFormat, editor.document);
    return { editor, view };
  }

  it("accepts the parse of a format that shows each block", () => {
    const { editor, view } = setup();
    // An HTML tag without a source gives no block (a core rule).
    const text = "Hello\n\n<img>\n\n![](https://example.com/a.png)";
    const parsed = parseText(editor, markdownFormat, text);
    const blocks = parsed.error === undefined ? parsed.blocks : [];

    expect(blocks.map(({ type }) => type)).toEqual(["paragraph", "image"]);
    expect(() =>
      assertBlocksRoundTrip(editor, markdownFormat, blocks, view, text),
    ).not.toThrow();
  });

  it("throws for a block that the format does not show", () => {
    const { editor, view } = setup();
    const text = "Hello, changed";

    expect(() =>
      assertBlocksRoundTrip(
        editor,
        brokenFormat,
        brokenFormat.parse(editor, text),
        view,
        text,
      ),
    ).toThrow(/does not show/);
  });

  it("stops a write with such a format, and the document does not change", () => {
    const { editor } = setup();
    const before = editor.document;

    expect(() =>
      updateDocument(editor, {
        base: "current",
        format: brokenFormat,
        text: "Hello, changed",
      }),
    ).toThrow(/does not show/);
    expect(editor.document).toEqual(before);
  });
});
