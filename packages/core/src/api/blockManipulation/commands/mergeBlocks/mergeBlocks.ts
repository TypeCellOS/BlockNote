import { EditorState, TextSelection } from "prosemirror-state";

import { isContentContainerNode } from "../../../../schema/blocks/children.js";
import { getAncestorContainers } from "../../containers/containerNav.js";
import { fixContainersById } from "../../containers/fixContainer.js";
import {
  BlockInfo,
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getPrevBlockInfo,
} from "../../../getBlockInfoFromPos.js";

const canMerge = (prevBlockInfo: BlockInfo, nextBlockInfo: BlockInfo) => {
  return (
    prevBlockInfo.hasContent &&
    prevBlockInfo.contentKind === "inline" &&
    !prevBlockInfo.isContentEmpty &&
    // A content-bearing container is `hasContent` with an `inline`
    // title, but stitching across its boundary would orphan its required
    // `__children` node. `mergeIntoContainerContent` is the only supported
    // merge involving one.
    !isContentContainerNode(prevBlockInfo.block.node) &&
    nextBlockInfo.hasContent &&
    nextBlockInfo.contentKind === "inline" &&
    !isContentContainerNode(nextBlockInfo.block.node)
  );
};

const mergeBlocks = (
  state: EditorState,
  dispatch: ((args?: any) => any) | undefined,
  prevBlockInfo: BlockInfo,
  nextBlockInfo: BlockInfo,
) => {
  // Un-nests all children of the next block.
  if (!nextBlockInfo.hasContent) {
    throw new Error(
      `Attempted to merge block at position ${nextBlockInfo.block.beforePos} into previous block at position ${prevBlockInfo.block.beforePos}, but next block is not a block container`,
    );
  }

  // Removes a level of nesting all children of the next block by 1 level, if it contains both content and block
  // group nodes.
  if (nextBlockInfo.children) {
    const childBlocksStart = state.doc.resolve(
      nextBlockInfo.children.childrenStart,
    );
    const childBlocksEnd = state.doc.resolve(
      nextBlockInfo.children.childrenEnd,
    );
    const childBlocksRange = childBlocksStart.blockRange(childBlocksEnd);

    if (dispatch) {
      const pos = state.doc.resolve(nextBlockInfo.block.beforePos);
      state.tr.lift(childBlocksRange!, pos.depth);
    }
  }

  // Deletes the boundary between the two blocks. Can be thought of as
  // removing the closing tags of the first block and the opening tags of the
  // second one to stitch them together.
  if (dispatch) {
    if (!prevBlockInfo.hasContent) {
      throw new Error(
        `Attempted to merge block at position ${nextBlockInfo.block.beforePos} into previous block at position ${prevBlockInfo.block.beforePos}, but previous block is not a block container`,
      );
    }

    // Merging into or out of container blocks (columnLists, callouts, ...)
    // is intentionally unsupported; `canMerge` refuses it above. The
    // container-boundary Backspace/Delete branches in
    // `KeyboardShortcutsExtension` handle those cases by moving blocks
    // across the boundary instead of merging their content.
    dispatch(
      state.tr.delete(prevBlockInfo.contentEnd, nextBlockInfo.contentStart),
    );
  }

  return true;
};

/**
 * Merges a container's first child into the container's own content. This is
 * the Backspace-at-the-start-of-the-first-child case for a container that has
 * a title of its own. The child's own children stay in the container, taking
 * its place.
 *
 * Deliberately separate from `canMerge`/`mergeBlocks`: a pure container has
 * no content to merge into, so those keep refusing container boundaries
 * outright and the "move the block out" branch still handles them. Returns
 * false whenever either side isn't inline content, falling through to that
 * branch.
 */
export const mergeIntoContainerContent = (
  state: EditorState,
  dispatch: ((args?: any) => any) | undefined,
  containerInfo: BlockInfo,
  childInfo: BlockInfo,
) => {
  if (!containerInfo.hasContent || !childInfo.hasContent) {
    return false;
  }

  const childContent = childInfo.content;

  if (
    containerInfo.contentKind !== "inline" ||
    childInfo.contentKind !== "inline"
  ) {
    return false;
  }

  if (dispatch) {
    const tr = state.tr;

    // The container (and its ancestors) may need `whenEmptied` repair once the
    // child is removed - e.g. an unwrap container left with an empty title
    // collapses, or a refill container reseeds its default. Captured before the
    // deletes, applied after.
    const containersToFix = getAncestorContainers(
      state.doc,
      childInfo.block.beforePos,
    );

    // The title lies before the children, so none of these positions shift the
    // ones used after them.
    if (childInfo.children?.node.childCount) {
      tr.insert(childInfo.block.afterPos, childInfo.children.node.content);
    }
    tr.delete(childInfo.block.beforePos, childInfo.block.afterPos);

    const titleEndPos = containerInfo.contentEnd;
    tr.insert(titleEndPos, childContent.node.content);

    const stepsBeforeFix = tr.steps.length;
    fixContainersById(tr, containersToFix);
    // Place the caret at the merge point, mapped through any repair (which may
    // have unwrapped or reseeded the container, so the raw position can shift).
    tr.setSelection(
      TextSelection.near(
        tr.doc.resolve(tr.mapping.slice(stepsBeforeFix).map(titleEndPos)),
      ),
    );

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
    const nextBlockInfo = getBlockInfoAt(state.doc, posBetweenBlocks);

    const prevBlockInfo = getPrevBlockInfo(
      state.doc,
      nextBlockInfo.block.beforePos,
    );

    if (!prevBlockInfo) {
      return false;
    }

    const bottomNestedBlockInfo = getLastDescendantBlockInfo(
      state.doc,
      prevBlockInfo,
    );

    if (!canMerge(bottomNestedBlockInfo, nextBlockInfo)) {
      return false;
    }

    return mergeBlocks(state, dispatch, bottomNestedBlockInfo, nextBlockInfo);
  };
