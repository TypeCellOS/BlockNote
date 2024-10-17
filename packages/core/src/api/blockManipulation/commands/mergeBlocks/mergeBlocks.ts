import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

import { getBlockInfoFromResolvedPos } from "../../../getBlockInfoFromPos.js";

export const getPrevBlockPos = (doc: Node, $nextBlockPos: ResolvedPos) => {
  const prevNode = $nextBlockPos.nodeBefore;

  if (!prevNode) {
    throw new Error(
      `Attempted to get previous blockContainer node for merge at position ${$nextBlockPos.pos} but a previous node does not exist`
    );
  }

  // Finds the nearest previous block, regardless of nesting level.
  let prevBlockBeforePos = $nextBlockPos.posAtIndex($nextBlockPos.index() - 1);
  let prevBlockInfo = getBlockInfoFromResolvedPos(
    doc.resolve(prevBlockBeforePos)
  );

  while (prevBlockInfo.blockGroup) {
    const group = prevBlockInfo.blockGroup.node;

    prevBlockBeforePos = doc
      .resolve(prevBlockInfo.blockGroup.beforePos + 1)
      .posAtIndex(group.childCount - 1);
    prevBlockInfo = getBlockInfoFromResolvedPos(
      doc.resolve(prevBlockBeforePos)
    );
  }

  return doc.resolve(prevBlockBeforePos);
};

const canMerge = ($prevBlockPos: ResolvedPos, $nextBlockPos: ResolvedPos) => {
  const prevBlockInfo = getBlockInfoFromResolvedPos($prevBlockPos);
  const nextBlockInfo = getBlockInfoFromResolvedPos($nextBlockPos);

  return (
    prevBlockInfo.blockContent.node.type.spec.content === "inline*" &&
    nextBlockInfo.blockContent.node.type.spec.content === "inline*" &&
    prevBlockInfo.blockContent.node.childCount > 0
  );
};

const mergeBlocks = (
  state: EditorState,
  dispatch: ((args?: any) => any) | undefined,
  $prevBlockPos: ResolvedPos,
  $nextBlockPos: ResolvedPos
) => {
  const nextBlockInfo = getBlockInfoFromResolvedPos($nextBlockPos);

  // Un-nests all children of the next block.
  if (nextBlockInfo.blockGroup) {
    const childBlocksStart = state.doc.resolve(
      nextBlockInfo.blockGroup.beforePos + 1
    );
    const childBlocksEnd = state.doc.resolve(
      nextBlockInfo.blockGroup.afterPos - 1
    );
    const childBlocksRange = childBlocksStart.blockRange(childBlocksEnd);

    if (dispatch) {
      state.tr.lift(childBlocksRange!, $nextBlockPos.depth);
    }
  }

  // Deletes the boundary between the two blocks. Can be thought of as
  // removing the closing tags of the first block and the opening tags of the
  // second one to stitch them together.
  if (dispatch) {
    const prevBlockInfo = getBlockInfoFromResolvedPos($prevBlockPos);

    dispatch(
      state.tr.delete(
        prevBlockInfo.blockContent.afterPos - 1,
        nextBlockInfo.blockContent.beforePos + 1
      )
    );
  }

  return true;
};

export const mergeBlocksCommand =
  (posBetweenBlocks: number) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const $nextBlockPos = state.doc.resolve(posBetweenBlocks);
    const $prevBlockPos = getPrevBlockPos(state.doc, $nextBlockPos);

    if (!canMerge($prevBlockPos, $nextBlockPos)) {
      return false;
    }

    return mergeBlocks(state, dispatch, $prevBlockPos, $nextBlockPos);
  };
