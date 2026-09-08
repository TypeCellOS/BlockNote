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

  // At the start, children follow the entire title to the second block.
  // Otherwise they belong to the first half, all within the same undo step.
  const children = posInBlock === info.contentStart ? undefined : info.children;
  if (children) {
    tr.delete(children.beforePos, children.afterPos);
  }
  tr.split(posInBlock, 2, types);
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
