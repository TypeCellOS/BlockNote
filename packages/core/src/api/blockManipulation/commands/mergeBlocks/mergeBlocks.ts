import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

import {
  isCompartment,
  isContainerNode,
} from "../../../../schema/blocks/containers.js";
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
  // Un-nests all children of the next block.
  if (!nextBlockInfo.isBlockContainer) {
    throw new Error(
      `Attempted to merge block at position ${nextBlockInfo.bnBlock.beforePos} into previous block at position ${prevBlockInfo.bnBlock.beforePos}, but next block is not a block container`,
    );
  }

  // Removes a level of nesting all children of the next block by 1 level, if it contains both content and block
  // group nodes.
  if (nextBlockInfo.childContainer) {
    const childBlocksStart = state.doc.resolve(
      nextBlockInfo.childContainer.beforePos + 1,
    );
    const childBlocksEnd = state.doc.resolve(
      nextBlockInfo.childContainer.afterPos - 1,
    );
    const childBlocksRange = childBlocksStart.blockRange(childBlocksEnd);

    if (dispatch) {
      const pos = state.doc.resolve(nextBlockInfo.bnBlock.beforePos);
      state.tr.lift(childBlocksRange!, pos.depth);
    }
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

    // TODO: test merging between a columnList and paragraph, between two columnLists, and v.v.
    dispatch(
      state.tr.delete(
        prevBlockInfo.blockContent.afterPos - 1,
        nextBlockInfo.blockContent.beforePos + 1,
      ),
    );
  }

  return true;
};

/**
 * The block owning the compartment that the block at `beforePos` is the first
 * child of - a callout, for the first block of its body. `undefined` when the
 * block isn't the first child of a compartment.
 */
export const compartmentOwnerInfo = (doc: Node, beforePos: number) => {
  const $pos = doc.resolve(beforePos);
  if ($pos.index() !== 0 || $pos.depth < 2) {
    return undefined;
  }
  // The body's own node is the compartment (a column), or it is a `blockGroup`
  // and the compartment is the block holding it.
  const ownerDepth = isContainerNode($pos.node().type)
    ? $pos.depth
    : $pos.depth - 1;
  const owner = $pos.node(ownerDepth);
  if (ownerDepth < 1 || !isCompartment(owner)) {
    return undefined;
  }
  return getBlockInfoFromResolvedPos(doc.resolve($pos.before(ownerDepth)));
};

/**
 * Merges `nextBlockInfo` into `prevBlockInfo`, when both hold inline content.
 * Unlike {@link mergeBlocksCommand} the two blocks are given rather than
 * derived from a position, so blocks that aren't siblings can be merged - a
 * compartment's first child into the block that owns it.
 */
export const mergeBlockPairCommand =
  (prevBlockInfo: BlockInfo, nextBlockInfo: BlockInfo) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    if (!canMerge(prevBlockInfo, nextBlockInfo)) {
      return false;
    }
    return mergeBlocks(state, dispatch, prevBlockInfo, nextBlockInfo);
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
