import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { markdownFormat } from "../formats/markdown.js";
import type { TextFormat } from "../formats/types.js";
import { documentText } from "./cache.js";

/** A markdown format that counts its calls. */
function countingFormat() {
  const calls = { serialize: 0, parse: 0 };
  const format: TextFormat = {
    serialize: (editor, blocks) => {
      calls.serialize++;
      return markdownFormat.serialize(editor, blocks);
    },
    parse: (editor, text) => {
      calls.parse++;
      return markdownFormat.parse(editor, text);
    },
  };
  return { format, calls };
}

describe("documentText", () => {
  it("serializes and projects one version one time", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Alpha" }],
    });
    const { format, calls } = countingFormat();
    const document = editor.document as LensBlock[];

    const first = documentText(editor, format, document);
    const projection = first.projection();
    const parses = calls.parse;
    const second = documentText(editor, format, document);

    expect(second.text).toBe(first.text);
    expect(second.projection()).toBe(projection);
    expect(calls.serialize).toBe(1);
    expect(calls.parse).toBe(parses);
  });

  it("serializes a changed document again", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Alpha" }],
    });
    const { format, calls } = countingFormat();
    documentText(editor, format, editor.document as LensBlock[]);
    editor.insertBlocks(
      [{ type: "paragraph", content: "Beta" }],
      editor.document[0],
      "after",
    );

    const { text } = documentText(
      editor,
      format,
      editor.document as LensBlock[],
    );

    expect(text).toBe("Alpha\n\nBeta\n");
    expect(calls.serialize).toBe(2);
  });
});
