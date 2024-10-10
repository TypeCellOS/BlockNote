import { Slice } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";

import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";

export const mergeBlocksCommand =
  (posBetweenBlocks: number) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const nextNodeIsBlock =
      state.doc.resolve(posBetweenBlocks + 1).node().type.name ===
      "blockContainer";
    const prevNodeIsBlock =
      state.doc.resolve(posBetweenBlocks - 1).node().type.name ===
      "blockContainer";

    if (!nextNodeIsBlock || !prevNodeIsBlock) {
      return false;
    }

    const nextBlockInfo = getBlockInfoFromPos(state.doc, posBetweenBlocks);

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
        state.tr.lift(childBlocksRange!, nextBlockInfo.depth);
      }
    }

    let prevBlockEndPos = posBetweenBlocks - 1;
    let prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);

    // Finds the nearest previous block, regardless of nesting level.
    while (prevBlockInfo.blockGroup) {
      prevBlockEndPos--;
      prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);
      if (prevBlockInfo === undefined) {
        return false;
      }
    }

    // Deletes next block and adds its text content to the nearest previous block.

    if (dispatch) {
      dispatch(
        state.tr
          .deleteRange(
            nextBlockInfo.blockContent.beforePos,
            nextBlockInfo.blockContent.afterPos
          )
          .replace(
            prevBlockEndPos - 1,
            nextBlockInfo.blockContent.beforePos,
            new Slice(nextBlockInfo.blockContent.node.content, 0, 0)
          )
        // .scrollIntoView()
      );

      state.tr.setSelection(
        new TextSelection(state.doc.resolve(prevBlockEndPos - 1))
      );
    }

    return true;
  };
