import { EditorState, Transaction } from "prosemirror-state";

import {
  getBlockInfoFromNode,
  getNearestBlockPos,
} from "../../../getBlockInfoFromPos.js";
import { getPmSchema } from "../../../pmUtil.js";

export const splitBlockCommand = (
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
  keepChildren?: boolean,
) => {
  return ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    if (dispatch) {
      return splitBlockTr(
        state.tr,
        posInBlock,
        keepType,
        keepProps,
        keepChildren,
      );
    }

    return true;
  };
};

export const splitBlockTr = (
  tr: Transaction,
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
  keepChildren?: boolean,
): boolean => {
  const nearestBlockContainerPos = getNearestBlockPos(tr.doc, posInBlock);

  const info = getBlockInfoFromNode(
    nearestBlockContainerPos.node,
    nearestBlockContainerPos.posBeforeNode,
  );

  if (!info.hasContent) {
    return false;
  }
  const schema = getPmSchema(tr);

  const types = [
    {
      type: info.block.node.type, // always keep blockcontainer type
      attrs: keepProps ? { ...info.block.node.attrs, id: undefined } : {},
    },
    {
      type: keepType ? info.content.node.type : schema.nodes["paragraph"],
      attrs: keepProps ? { ...info.content.node.attrs } : {},
    },
  ];

  // Split editable inline ancestors too. Omitted type overrides let ProseMirror
  // copy them, preserving their attributes and marks on both sides.
  const $pos = tr.doc.resolve(posInBlock);
  // Measure from the block's content node, not the document root: nesting blocks
  // adds unrelated depth. Only inline ancestors below it extend the usual
  // two-level split (blockContainer + block content).
  const contentDepth = tr.doc.resolve(info.contentStart).depth;
  const splitDepth = 2 + $pos.depth - contentDepth;

  // The children follow the text after the caret into the second block, as
  // `tr.split` leaves them. With `keepChildren` they move back to the first
  // half, within the same undo step. At the start, the whole content goes to
  // the second block, and the children with it.
  const children =
    keepChildren && posInBlock !== info.contentStart
      ? info.children
      : undefined;
  if (children) {
    tr.delete(children.beforePos, children.afterPos);
  }
  tr.split(posInBlock, splitDepth, types);
  if (children) {
    const original = tr.doc.nodeAt(info.block.beforePos);
    if (!original?.firstChild) {
      throw new Error("Split lost its original block");
    }
    tr.insert(
      info.block.beforePos + 1 + original.firstChild.nodeSize,
      children.node,
    );
  }

  return true;
};
