import { Transaction } from "prosemirror-state";
import { Level } from "../nodes/Block";
import { findBlock } from "./findBlock";

type Dispatch = ((args?: any) => any) | undefined;

export function setBlockHeading(
  tr: Transaction,
  dispatch: Dispatch,
  level?: Level
) {
  // Get parent of TextNode
  const containingBlock = findBlock(tr.selection);

  // Should not be possible because schema dictates
  // that each text node is nested in a BlockContent
  // node which is nested inside a BlockNode
  if (!containingBlock) return false;

  // Add heading attribute to Block
  if (dispatch) {
    tr.setNodeMarkup(containingBlock.pos, undefined, {
      ...containingBlock.node.attrs,
      headingType: level,
    });
  }
  return true;
}
