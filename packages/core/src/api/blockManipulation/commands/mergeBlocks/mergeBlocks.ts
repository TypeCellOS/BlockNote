import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

import {
  BlockInfo,
  getBlockInfoFromResolvedPos,
} from "../../../getBlockInfoFromPos.js";

/**
 * Returns the block info from the parent block
 * or undefined if we're at the root
 */
export const getParentBlockInfo = (
  doc: Node,
  beforePos: number,
): BlockInfo | undefined => {
  const $pos = doc.resolve(beforePos);
  const depth = $pos.depth - 1;

  if (depth < 1) {
    return undefined;
  }

  const parentBeforePos = $pos.before(depth);
  const parentNode = doc.resolve(parentBeforePos).nodeAfter;

  if (!parentNode) {
    return undefined;
  }

  if (!parentNode.type.spec.group?.includes("bnBlock")) {
    return getParentBlockInfo(doc, parentBeforePos);
  }

  const parentBlockInfo = getBlockInfoFromResolvedPos(
    doc.resolve(parentBeforePos),
  );

  return parentBlockInfo;
};

/**
 * Returns the block info from the sibling block before (above) the given block,
 * or undefined if the given block is the first sibling.
 */
export const getPrevBlockInfo = (doc: Node, beforePos: number) => {
  const $pos = doc.resolve(beforePos);

  const indexInParent = $pos.index();

  if (indexInParent === 0) {
    return undefined;
  }

  const prevBlockBeforePos = $pos.posAtIndex(indexInParent - 1);

  const prevBlockInfo = getBlockInfoFromResolvedPos(
    doc.resolve(prevBlockBeforePos),
  );
  return prevBlockInfo;
};

/**
 * Returns the block info from the sibling block after (below) the given block,
 * or undefined if the given block is the last sibling.
 */
export const getNextBlockInfo = (doc: Node, beforePos: number) => {
  const $pos = doc.resolve(beforePos);

  const indexInParent = $pos.index();

  if (indexInParent === $pos.node().childCount - 1) {
    return undefined;
  }

  const nextBlockBeforePos = $pos.posAtIndex(indexInParent + 1);

  const nextBlockInfo = getBlockInfoFromResolvedPos(
    doc.resolve(nextBlockBeforePos),
  );
  return nextBlockInfo;
};

/**
 * If a block has children like this:
 * A
 * - B
 * - C
 * -- D
 *
 * Then the bottom nested block returned is D.
 */
export const getBottomNestedBlockInfo = (doc: Node, blockInfo: BlockInfo) => {
  while (blockInfo.childContainer) {
    const group = blockInfo.childContainer.node;

    const newPos = doc
      .resolve(blockInfo.childContainer.beforePos + 1)
      .posAtIndex(group.childCount - 1);
    blockInfo = getBlockInfoFromResolvedPos(doc.resolve(newPos));
  }

  return blockInfo;
};

const canMerge = (prevBlockInfo: BlockInfo, nextBlockInfo: BlockInfo) => {
  return (
    prevBlockInfo.isBlockContainer &&
    prevBlockInfo.blockContent.node.type.spec.content === "inline*" &&
    prevBlockInfo.blockContent.node.childCount > 0 &&
    nextBlockInfo.isBlockContainer &&
    nextBlockInfo.blockContent.node.type.spec.content === "inline*"
  );
};

const mergeBlocks = (
  state: EditorState,
  dispatch: ((args?: any) => any) | undefined,
  prevBlockInfo: BlockInfo,
  nextBlockInfo: BlockInfo,
) => {
  if (!nextBlockInfo.isBlockContainer) {
    throw new Error(
      `Attempted to merge block at position ${nextBlockInfo.bnBlock.beforePos} into previous block at position ${prevBlockInfo.bnBlock.beforePos}, but next block is not a block container`,
    );
  }

  // Deletes the boundary between the two blocks. Can be thought of as
  // removing the closing tags of the first block and the opening tags of the
  // second one to stitch them together.
  if (dispatch) {
    if (!prevBlockInfo.isBlockContainer) {
      throw new Error(
        `Attempted to merge block at position ${nextBlockInfo.bnBlock.beforePos} into previous block at position ${prevBlockInfo.bnBlock.beforePos}, but previous block is not a block container`,
      );
    }

    const tr = state.tr;
    const childGroup = nextBlockInfo.childContainer;

    // Takes the next block's children out first, so the merge leaves no empty
    // shell of the next block behind.
    if (childGroup) {
      tr.delete(childGroup.beforePos, childGroup.afterPos);
    }

    // TODO: test merging between a columnList and paragraph, between two columnLists, and v.v.
    tr.delete(
      tr.mapping.map(prevBlockInfo.blockContent.afterPos - 1),
      tr.mapping.map(nextBlockInfo.blockContent.beforePos + 1),
    );

    // Puts the children back at the depth they had: appended to the merged
    // block's ancestor at that depth when there is one, otherwise nested under
    // the merged block.
    if (childGroup) {
      const childDepth = state.doc.resolve(childGroup.beforePos + 1).depth;
      const $merged = tr.doc.resolve(
        tr.mapping.map(prevBlockInfo.blockContent.beforePos) + 1,
      );
      const ancestor =
        childDepth < $merged.depth - 1 ? $merged.node(childDepth) : undefined;

      if (
        ancestor?.canReplace(
          ancestor.childCount,
          ancestor.childCount,
          childGroup.node.content,
        )
      ) {
        tr.insert($merged.end(childDepth), childGroup.node.content);
      } else {
        tr.insert($merged.after($merged.depth), childGroup.node);
      }
    }

    dispatch(tr);
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
    const $pos = state.doc.resolve(posBetweenBlocks);
    const nextBlockInfo = getBlockInfoFromResolvedPos($pos);

    const prevBlockInfo = getPrevBlockInfo(
      state.doc,
      nextBlockInfo.bnBlock.beforePos,
    );

    if (!prevBlockInfo) {
      return false;
    }

    const bottomNestedBlockInfo = getBottomNestedBlockInfo(
      state.doc,
      prevBlockInfo,
    );

    if (!canMerge(bottomNestedBlockInfo, nextBlockInfo)) {
      return false;
    }

    return mergeBlocks(state, dispatch, bottomNestedBlockInfo, nextBlockInfo);
  };
