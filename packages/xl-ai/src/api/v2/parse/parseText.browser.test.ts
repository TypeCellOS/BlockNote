import { describe, expect } from "vite-plus/test";

import { blockToText } from "../util/blocks/text.js";
import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { parseText, withoutByteOrderMark } from "./parseText.js";

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)({
      initialContent: [{ id: "p", type: "paragraph", content: "Hello" }],
    });
    return editor;
  },
);

describe("parseText", () => {
  it("gives the blocks in the form that the document stores them", ({
    editor,
  }) => {
    const result = parseText(editor, markdownFormat, "Hello\n\nWorld");

    expect(result.error).toBeUndefined();
    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map((block) => blockToText(block))).toEqual([
      "Hello",
      "World",
    ]);
    // A missing field gets its default value, as in the document.
    expect(blocks[0].props).toEqual(editor.document[0].props);
  });

  it("gives an error for blocks that do not fit the schema", ({ editor }) => {
    // A text alignment that the schema does not have.
    const text = '<p data-text-alignment="diagonal">Text</p>';

    expect(parseText(editor, htmlFormat, text)).toEqual({
      error: "invalid-document",
    });
  });
});

describe("withoutByteOrderMark", () => {
  it("removes a byte order mark at the start of the text", () => {
    expect(withoutByteOrderMark("\uFEFFHello", "Hello")).toBe("Hello");
  });

  it("keeps it if the text of the document starts with it", () => {
    expect(withoutByteOrderMark("\uFEFFHello", "\uFEFFHello")).toBe(
      "\uFEFFHello",
    );
  });
});
