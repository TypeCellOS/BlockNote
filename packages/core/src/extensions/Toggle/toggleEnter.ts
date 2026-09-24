import type { Transaction } from "prosemirror-state";
import { insertEmptyFirstChild } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ToggleExtension } from "./Toggle.js";

/** Only plain Enter at the end of a nonempty, expanded title starts a child. */
export function handleToggleEnter(
  editor: Pick<BlockNoteEditor, "getExtension">,
  tr: Transaction,
): boolean {
  const info = getBlockInfoFromSelection(tr);
  if (
    !info.hasContent ||
    !tr.selection.empty ||
    info.isContentEmpty ||
    tr.selection.from !== info.contentEnd ||
    editor
      .getExtension(ToggleExtension)
      ?.isExpanded(info.block.node.attrs.id) !== true
  ) {
    return false;
  }
  return insertEmptyFirstChild(tr, info.block.beforePos);
}
