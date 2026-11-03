import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

describe("the HTML parse of a check list item", () => {
  const editor = BlockNoteEditor.create();

  it("reads a toggle list item with a check list child as a toggle", () => {
    const html = editor.blocksToHTMLLossy([
      {
        type: "toggleListItem",
        content: "Toggle",
        children: [
          { type: "checkListItem", props: { checked: true }, content: "Done" },
        ],
      },
    ]);
    expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
      {
        type: "toggleListItem",
        children: [{ type: "checkListItem", props: { checked: true } }],
      },
    ]);
  });
});
