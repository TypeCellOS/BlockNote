import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/yjs";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { bindEditor, unbindEditor } from "../testUtil/yjs.js";
import { updateYDoc } from "./yDocText.js";

const reader = BlockNoteEditor.create();

function setup(initialContent: PartialBlock[]) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent }).document,
  );
  const fragment = ydoc.getXmlFragment("prosemirror");
  const editor = bindEditor(fragment);
  /** The ID and the text of each block of the Y.Doc. */
  const blocks = () =>
    yDocToBlocks(reader, ydoc).map((block) => [
      block.id,
      (block.content as { text: string }[])[0]?.text,
    ]);
  return { ydoc, fragment, editor, blocks };
}

describe("updateYDoc: a JSON change", () => {
  it("writes the blocks of the JSON to the Y.Doc", () => {
    const { editor, fragment, blocks } = setup([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);

    const result = updateYDoc(editor, fragment, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha changed" },
        { id: "b", type: "paragraph", content: "Beta" },
        { type: "paragraph", content: "New" },
      ],
      base: "current",
    });

    expect(result.error).toBeUndefined();
    expect(blocks().slice(0, 2)).toEqual([
      ["a", "Alpha changed"],
      ["b", "Beta"],
    ]);
    expect(blocks()[2][1]).toBe("New");
  });

  it("keeps the change of another user for a JSON change from an older version", () => {
    const { ydoc, fragment, editor, blocks } = setup([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const base = Y.encodeStateAsUpdate(ydoc);
    // Another user changes block b.
    const user = bindEditor(fragment);
    user.updateBlock("b", { content: "Beta by the user" });
    unbindEditor(user);

    const result = updateYDoc(editor, fragment, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha by the client" },
        { id: "b", type: "paragraph", content: "Beta" },
      ],
      base,
    });

    expect(result.error).toBeUndefined();
    expect(blocks()).toEqual([
      ["a", "Alpha by the client"],
      ["b", "Beta by the user"],
    ]);
  });
});
