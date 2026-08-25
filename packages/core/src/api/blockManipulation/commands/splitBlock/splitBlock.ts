import { EditorState, Transaction } from "prosemirror-state";

import {
  getBlockInfoFromNode,
  getNearestBlockPos,
} from "../../../getBlockInfoFromPos.js";
import { getPmSchema } from "../../../pmUtil.js";
import { isContentContainerNode } from "../../../../schema/blocks/children.js";

export const splitBlockCommand = (
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
) => {
  return ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    if (dispatch) {
      return splitBlockTr(state.tr, posInBlock, keepType, keepProps);
    }

    return true;
  };
};

export const splitBlockTr = (
  tr: Transaction,
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
): boolean => {
  const nearestBlockContainerPos = getNearestBlockPos(tr.doc, posInBlock);

  const info = getBlockInfoFromNode(
    nearestBlockContainerPos.node,
    nearestBlockContainerPos.posBeforeNode,
  );

  if (!info.hasContent) {
    return false;
  }
  // A content-bearing container's own node can't be split: its content
  // expression requires the generated `__content`/`__children` pair, so
  // `tr.split` (which would start a second container with a bare paragraph)
  // throws. Splitting a title has no meaning anyway, so refuse it — callers
  // fall through to a no-op.
  if (isContentContainerNode(info.block.node)) {
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

  tr.split(posInBlock, 2, types);

  return true;
};
