import { describe, expect, it } from "vite-plus/test";

import { getDocumentText, plainTextFormat, updateDocument } from "./index.js";
import { createEditor } from "./testUtil/fixtures.js";

/** Writes the text and returns the ID, the text and the background of each block. */
function write(
  editor: ReturnType<typeof createEditor>,
  edit: (text: string) => string,
) {
  const text = edit(getDocumentText(editor, plainTextFormat));
  updateDocument(editor, { format: plainTextFormat, text, base: "current" });
  expect(getDocumentText(editor, plainTextFormat)).toBe(text);
  return editor.document.map((block) => [
    block.id,
    (block.content as { text: string }[])[0]?.text,
    "backgroundColor" in block.props ? block.props.backgroundColor : undefined,
  ]);
}

function swap(text: string, first: string, second: string) {
  return text
    .replace(first, "\u0000")
    .replace(second, first)
    .replace("\u0000", second);
}

describe("blocks that swap places in the text", () => {
  it("keep their IDs and props if they are adjacent", () => {
    const editor = createEditor([
      {
        id: "one",
        type: "paragraph",
        content: "Item 1",
        props: { backgroundColor: "red" },
      },
      { id: "two", type: "paragraph", content: "Item 2" },
    ]);
    expect(write(editor, (text) => swap(text, "Item 1", "Item 2"))).toEqual([
      ["two", "Item 2", "default"],
      ["one", "Item 1", "red"],
    ]);
  });

  it("KNOWN LIMIT: keep the text, but not the IDs and props, if they are similar and other blocks are between them", () => {
    // See the README, "Identity". The text of the result is correct (PutGet,
    // see `write`), but each position keeps its block: the red background
    // stays at the first position.
    const editor = createEditor([
      {
        id: "above",
        type: "paragraph",
        content: "Note: see above",
        props: { backgroundColor: "red" },
      },
      { id: "x", type: "paragraph", content: "a1 b1" },
      { id: "y", type: "paragraph", content: "a2 b2" },
      { id: "below", type: "paragraph", content: "Note: see below" },
    ]);
    expect(
      write(editor, (text) => swap(text, "Note: see above", "Note: see below")),
    ).toEqual([
      ["above", "Note: see below", "red"],
      ["x", "a1 b1", "default"],
      ["y", "a2 b2", "default"],
      ["below", "Note: see above", "default"],
    ]);
  });
});
