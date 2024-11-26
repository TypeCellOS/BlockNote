import { EditorState } from "prosemirror-state";

import {
  getBlockInfo,
  getNearestBlockPos,
} from "../../../getBlockInfoFromPos.js";

export const splitBlockCommand = (
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean
) => {
  return ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const nearestBlockContainerPos = getNearestBlockPos(state.doc, posInBlock);

    const info = getBlockInfo(nearestBlockContainerPos);

    if (!info.isBlockContainer) {
      throw new Error(
        `BlockContainer expected when calling splitBlock, position ${posInBlock}`
      );
    }

    const types = [
      {
        type: info.bnBlock.node.type, // always keep blockcontainer type
        attrs: keepProps ? { ...info.bnBlock.node.attrs, id: undefined } : {},
      },
      {
        type: keepType
          ? info.blockContent.node.type
          : state.schema.nodes["paragraph"],
        attrs: keepProps ? { ...info.blockContent.node.attrs } : {},
      },
    ];

    if (dispatch) {
      state.tr.split(posInBlock, 2, types);
    }

    return true;
  };
};
