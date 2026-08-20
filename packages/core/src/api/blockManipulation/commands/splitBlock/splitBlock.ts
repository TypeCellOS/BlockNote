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

  // A block's children live in a `blockGroup` that sits *after* its content
  // inside the `blockContainer`. A plain split would therefore hand that group
  // to the new block, i.e. the new block would steal the original's children.
  // To avoid that, the group is detached before the split and put back on the
  // original block afterwards. Both happen in the same transaction, so this is
  // still a single undo step.
  const childContainer = info.childContainer;

  if (childContainer) {
    // The group sits after `posInBlock`, so deleting it doesn't shift the split
    // position.
    tr.delete(childContainer.beforePos, childContainer.afterPos);
  }

  tr.split(posInBlock, 2, types);

  if (childContainer) {
    // The original block starts before `posInBlock`, so its position is
    // unaffected by the delete and the split.
    const originalBlockInfo = getBlockInfo(
      getNearestBlockPos(tr.doc, nearestBlockContainerPos.posBeforeNode),
    );

    if (!originalBlockInfo.isBlockContainer) {
      throw new Error(
        "Block that was just split is no longer a block container",
      );
    }

    tr.insert(originalBlockInfo.blockContent.afterPos, childContainer.node);
  }

  return true;
};
