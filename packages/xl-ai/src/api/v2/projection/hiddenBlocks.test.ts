import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { markdownFormat } from "../formats/markdown.js";
import { parseText } from "../parse/parseText.js";
import { withoutHiddenBlocks } from "./hiddenBlocks.js";
import { projectDocument } from "./projectDocument.js";

describe("withoutHiddenBlocks", () => {
  const editor = BlockNoteEditor.create({
    initialContent: [{ id: "p", type: "paragraph", content: "Hello" }],
  });
  const { view } = projectDocument(editor, markdownFormat, editor.document);

  it("removes a block that the format does not show", () => {
    // Markdown does not show an image without a URL. The parse of an HTML
    // tag in the text can give one.
    const text = "Hello\n\n<img>";
    const parsed = parseText(editor, markdownFormat, text);
    const blocks = parsed.error === undefined ? parsed.blocks : [];
    expect(blocks.map(({ type }) => type)).toEqual(["paragraph", "image"]);

    expect(
      withoutHiddenBlocks(editor, markdownFormat, blocks, view, text).map(
        ({ type }) => type,
      ),
    ).toEqual(["paragraph"]);
  });
});
