import type { Transaction } from "prosemirror-state";

import { insertEmptyFirstChild } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { CollapsibleExtension, isBlockCollapsible } from "./Collapsible.js";

/**
 * Enter at the end of an *expanded* collapsible block's title starts a first
 * child rather than a sibling (#1875) — its children are on screen, so that's
 * where the next block visibly belongs. A collapsed one splits off a sibling as
 * usual, since a new child would be hidden.
 *
 * No-ops on anything else, so callers don't need to check first.
 *
 * @returns Whether the key press was handled.
 */
export function handleCollapsibleEnter(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
): boolean {
  const info = getBlockInfoFromSelection(tr);

  if (
    !info.isBlockContainer ||
    !isBlockCollapsible(
      editor,
      info.blockNoteType,
      info.blockContent.node.attrs,
    )
  ) {
    return false;
  }

  const id = info.bnBlock.node.attrs.id;
  if (
    !id ||
    editor.getExtension(CollapsibleExtension)?.isCollapsed({ id }) !== false
  ) {
    return false;
  }

  // An empty block, or a cursor part-way through (or across) the title, is left
  // to the block's own Enter handling: unindent or split.
  if (
    !tr.selection.empty ||
    tr.selection.$anchor.parentOffset !== info.blockContent.node.content.size ||
    info.blockContent.node.childCount === 0
  ) {
    return false;
  }

  insertEmptyFirstChild(tr, info.bnBlock.beforePos);

  return true;
}
