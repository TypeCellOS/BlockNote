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

  tr.split(posInBlock, 2, types);

  return true;
};
