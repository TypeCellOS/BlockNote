import { BlockNoteEditor } from "@blocknote/core";
import { expect, it } from "vitest";
import { getBlockInfoFromPos } from "./extensions/Blocks/helpers/getBlockInfoFromPos";

/**
 * @vitest-environment jsdom
 */
it("creates an editor", () => {
  const editor = new BlockNoteEditor({});
  const blockInfo = getBlockInfoFromPos(editor.tiptapEditor.state.doc, 2);
  expect(blockInfo?.contentNode.type.name).toEqual("paragraph");
});
