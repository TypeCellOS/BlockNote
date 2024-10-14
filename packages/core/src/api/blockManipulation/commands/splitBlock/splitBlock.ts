import { EditorState } from "prosemirror-state";

import {
  getBlockInfo,
  getNearestBlockContainerPos,
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
    const nearestBlockContainerPos = getNearestBlockContainerPos(
      state.doc,
      posInBlock
    );

    const { blockContainer, blockContent } = getBlockInfo(
      nearestBlockContainerPos
    );

    const types = [
      {
        type: blockContainer.node.type, // always keep blockcontainer type
        attrs: keepProps ? { ...blockContainer.node.attrs, id: undefined } : {},
      },
      {
        type: keepType
          ? blockContent.node.type
          : state.schema.nodes["paragraph"],
        attrs: keepProps ? { ...blockContent.node.attrs } : {},
      },
    ];

    if (dispatch) {
      state.tr.split(posInBlock, 2, types);
    }

    return true;
  };
};
