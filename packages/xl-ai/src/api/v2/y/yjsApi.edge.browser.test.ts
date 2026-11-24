import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import { afterAll, beforeAll, describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../../tests/src/commands/browser/setupEditor.js";
import { createSetupEditor } from "../../../../../../tests/src/commands/node/setupEditor.js";

import { bindEditor, ownedYDoc, unbindEditor } from "../testUtil/y.js";
import { updateYDoc } from "./yjsApi.js";
import { updateYDocWithMerge } from "./yjsApiWithMerge.js";

/** One editor of the fixture, without a view: the schema and the reads of the Y.Doc. */
let reader: BlockNoteEditor<any, any, any>;
let disposeReader = () => {};
beforeAll(async () => {
  ({ editor: reader } = await createSetupEditor((dispose) => {
    disposeReader = dispose;
  })());
});
afterAll(() => disposeReader());

async function setup(setupEditor: SetupEditor, initialContent: PartialBlock[]) {
  const ydoc = ownedYDoc(
    blocksToYDoc(
      reader,
      (await setupEditor({ mountType: false, initialContent })).editor.document,
    ),
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
  it("writes the blocks of the JSON to the Y.Doc", async ({ setupEditor }) => {
    const { editor, fragment, blocks } = await setup(setupEditor, [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);

    const result = updateYDoc(editor, fragment, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha changed" },
        { id: "b", type: "paragraph", content: "Beta" },
        { type: "paragraph", content: "New" },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(blocks().slice(0, 2)).toEqual([
      ["a", "Alpha changed"],
      ["b", "Beta"],
    ]);
    expect(blocks()[2][1]).toBe("New");
  });

  it("keeps the change of another user for a JSON change from an older version", async ({
    setupEditor,
  }) => {
    const { ydoc, fragment, editor, blocks } = await setup(setupEditor, [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const base = Y.encodeStateAsUpdateV2(ydoc);
    // Another user changes block b.
    const user = await bindEditor(setupEditor, fragment);
    user.updateBlock("b", { content: "Beta by the user" });
    unbindEditor(user);

    const result = updateYDocWithMerge(editor, fragment, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha by the client" },
        { id: "b", type: "paragraph", content: "Beta" },
      ],
      base,
      onConflict: "keep-current",
    });

    expect(result.error).toBeUndefined();
    expect(blocks()).toEqual([
      ["a", "Alpha by the client"],
      ["b", "Beta by the user"],
    ]);
  });
});
