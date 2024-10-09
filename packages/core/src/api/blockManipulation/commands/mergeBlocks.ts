import { Slice } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";

import { getBlockInfoFromPos } from "../../getBlockInfoFromPos.js";

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

    const nextBlockInfo = getBlockInfoFromPos(state.doc, posBetweenBlocks + 1);

    const { node, contentNode, startPos, endPos, depth } = nextBlockInfo!;

    // Removes a level of nesting all children of the next block by 1 level, if it contains both content and block
    // group nodes.
    if (node.childCount === 2) {
      const childBlocksStart = state.doc.resolve(
        startPos + contentNode.nodeSize + 1
      );
      const childBlocksEnd = state.doc.resolve(endPos - 1);
      const childBlocksRange = childBlocksStart.blockRange(childBlocksEnd);

      // Moves the block group node inside the block into the block group node that the current block is in.
      if (dispatch) {
        state.tr.lift(childBlocksRange!, depth - 1);
      }
    }

    let prevBlockEndPos = posBetweenBlocks - 1;
    let prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);

    // Finds the nearest previous block, regardless of nesting level.
    while (prevBlockInfo!.numChildBlocks > 0) {
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
          .deleteRange(startPos, startPos + contentNode.nodeSize)
          .replace(
            prevBlockEndPos - 1,
            startPos,
            new Slice(contentNode.content, 0, 0)
          )
        // .scrollIntoView()
      );

      state.tr.setSelection(
        new TextSelection(state.doc.resolve(prevBlockEndPos - 1))
      );
    }

    return true;
  };
