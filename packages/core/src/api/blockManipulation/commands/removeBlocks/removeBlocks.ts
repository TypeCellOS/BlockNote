import { Block } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { removeAndInsertBlocksTr } from "../replaceBlocks/replaceBlocks.js";

export function removeBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocksToRemove: BlockIdentifier[]
): Block<BSchema, I, S>[] {
  const tr = editor.prosemirrorState.tr;
  const ret = removeAndInsertBlocksTr(editor, tr, blocksToRemove, []);

  editor.dispatch(tr);

  return ret.removedBlocks;
}
