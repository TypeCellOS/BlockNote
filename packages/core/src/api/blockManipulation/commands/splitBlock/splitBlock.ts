import { EditorState, Transaction } from "prosemirror-state";

import {
  getBlockInfo,
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

  const info = getBlockInfo(nearestBlockContainerPos);

  if (!info.isBlockContainer) {
    return false;
  }
  const schema = getPmSchema(tr);

  const types = [
    {
      type: info.bnBlock.node.type, // always keep blockcontainer type
      attrs: keepProps ? { ...info.bnBlock.node.attrs, id: undefined } : {},
    },
    {
      type: keepType ? info.blockContent.node.type : schema.nodes["paragraph"],
      attrs: keepProps ? { ...info.blockContent.node.attrs } : {},
    },
  ];

  tr.split(posInBlock, 2, types);

  return true;
};
