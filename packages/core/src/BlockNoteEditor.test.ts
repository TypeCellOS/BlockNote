import { expect, it } from "vitest";
import { BlockNoteEditor } from "./BlockNoteEditor";
import { getBlockInfoFromPos } from "./extensions/Blocks/helpers/getBlockInfoFromPos";

/**
 * @vitest-environment jsdom
 */
it("creates an editor", () => {
  const editor = new BlockNoteEditor({});
  const blockInfo = getBlockInfoFromPos(editor._tiptapEditor.state.doc, 2);
  expect(blockInfo?.contentNode.type.name).toEqual("paragraph");
});
