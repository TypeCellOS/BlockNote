import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import { describe, expect, it } from "vite-plus/test";

import { bindEditor, unbindEditor } from "../testUtil/y.js";
import { updateYDoc } from "./yDocText.js";
import { updateYDocWithMerge } from "./yDocTextWithMerge.js";

const reader = BlockNoteEditor.create();

function setup(initialContent: PartialBlock[]) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent }).document,
  );
  const fragment = ydoc.get("prosemirror");
  // The editor of the writes is not bound to the Y.Doc.
  const editor = reader;
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
      baseV2: "current",
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
    const baseV2 = Y.encodeStateAsUpdateV2(ydoc);
    // Another user changes block b.
    const user = bindEditor(fragment);
    user.updateBlock("b", { content: "Beta by the user" });
    unbindEditor(user);

    const result = updateYDocWithMerge(editor, fragment, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha by the client" },
        { id: "b", type: "paragraph", content: "Beta" },
      ],
      baseV2,
      onConflict: "keep-current",
    });

    expect(result.error).toBeUndefined();
    expect(blocks()).toEqual([
      ["a", "Alpha by the client"],
      ["b", "Beta by the user"],
    ]);
  });
});
