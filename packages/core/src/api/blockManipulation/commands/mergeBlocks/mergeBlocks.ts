import { EditorState } from "prosemirror-state";

import { getBlockInfo } from "../../../getBlockInfoFromPos.js";

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
    const nextNodeIsBlock = $pos.nodeAfter?.type.name === "blockContainer";
    const prevNodeIsBlock = $pos.nodeBefore?.type.name === "blockContainer";

    if (!nextNodeIsBlock || !prevNodeIsBlock) {
      throw new Error(
        "invalid `posBetweenBlocks` passed to mergeBlocksCommand"
      );
    }

    const nextBlockInfo = getBlockInfo($pos.nodeAfter, posBetweenBlocks);

    // Removes a level of nesting all children of the next block by 1 level, if it contains both content and block
    // group nodes.
    if (nextBlockInfo.blockGroup) {
      const childBlocksStart = state.doc.resolve(
        nextBlockInfo.blockGroup.beforePos + 1
      );
      const childBlocksEnd = state.doc.resolve(
        nextBlockInfo.blockGroup.afterPos - 1
      );
      const childBlocksRange = childBlocksStart.blockRange(childBlocksEnd);

      // Moves the block group node inside the block into the block group node that the current block is in.
      if (dispatch) {
        state.tr.lift(childBlocksRange!, $pos.depth);
      }
    }

    // TODO: extract helper?
    // Finds the nearest previous block, regardless of nesting level.
    let prevBlockStartPos = $pos.posAtIndex($pos.index() - 1);
    let prevBlockInfo = getBlockInfo(
      state.doc.resolve(prevBlockStartPos).nodeAfter!,
      prevBlockStartPos
    );
    while (prevBlockInfo.blockGroup) {
      const group = prevBlockInfo.blockGroup.node;

      prevBlockStartPos = state.doc
        .resolve(prevBlockInfo.blockGroup.beforePos + 1)
        .posAtIndex(group.childCount - 1);
      prevBlockInfo = getBlockInfo(
        state.doc.resolve(prevBlockStartPos).nodeAfter!,
        prevBlockStartPos
      );
    }

    console.log(
      prevBlockInfo.blockContent.afterPos,
      nextBlockInfo.blockContent.beforePos
    );
    debugger;
    // Deletes next block and adds its text content to the nearest previous block.
    if (dispatch) {
      dispatch(
        state.tr.deleteRange(
          prevBlockInfo.blockContent.afterPos - 1,
          nextBlockInfo.blockContent.beforePos + 1
        )

        // .scrollIntoView()
      );

      // TODO: fix unit test + think of missing tests
      // TODO: reenable set selection

      // state.tr.setSelection(
      //   new TextSelection(state.doc.resolve(prevBlockEndPos - 1))
      // );
    }

    return true;
  };
