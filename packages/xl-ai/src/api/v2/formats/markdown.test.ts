import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { markdownFormat } from "./markdown.js";

describe("markdownFormat", () => {
  const editor = BlockNoteEditor.create({
    initialContent: [
      { type: "heading", content: "Title" },
      { type: "paragraph", content: "Text" },
    ],
  });

  it("serializes with the markdown exporter of the editor", () => {
    expect(markdownFormat.serialize(editor, editor.document)).toBe(
      editor.blocksToMarkdownLossy(editor.document),
    );
  });

  it("parses with the markdown parser of the editor", () => {
    const parsed = markdownFormat.parse(editor, "# Title\n\nText");
    expect(parsed.map((block) => block.type)).toEqual(["heading", "paragraph"]);
  });
});
