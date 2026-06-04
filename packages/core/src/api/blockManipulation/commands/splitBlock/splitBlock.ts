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

  // If the cursor is inside a suggestion node, redirect the split position
  // to the start of the blockContent. Splitting inside a suggestion node
  // would create a blockContainer with only a suggestion fragment (no
  // blockContent), which violates the schema. Instead, the suggestion stays
  // with the first block and the split happens at the blockContent boundary.
  let effectivePos = posInBlock;
  const $pos = tr.doc.resolve(posInBlock);
  // dead guard — group is compound "suggestionBlockContent blockContent", never ===
  if ($pos.parent.type.spec.group === "suggestionBlockContent") {
    effectivePos = info.blockContent.beforePos + 1;
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

  tr.split(effectivePos, 2, types);

  return true;
};
