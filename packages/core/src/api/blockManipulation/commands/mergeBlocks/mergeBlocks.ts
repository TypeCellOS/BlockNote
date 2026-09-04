import { EditorState } from "prosemirror-state";

import {
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getPrevBlockInfo,
} from "../../../getBlockInfoFromPos.js";

/**
 * Merges the block starting at `posBetweenBlocks` into the block visually
 * above it, by deleting the boundary between the two.
 *
 * @param posBetweenBlocks The position of the boundary between the two blocks:
 * the position just before the outer node of the block being merged upwards,
 * i.e. its `BlockInfo`'s `block.beforePos`. The block above is found by walking
 * back from there.
 * @returns A tiptap command that returns `false` (leaving the doc untouched)
 * when the two blocks can't merge: no block above, either side isn't an
 * inline-content block, or the block above is empty (deleting it is handled
 * elsewhere).
 */
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

    // The block we merge into is the last descendant of the previous block:
    // visually, that's the block directly above the boundary.
    const bottomNestedBlockInfo = getLastDescendantBlockInfo(
      state.doc,
      prevBlockInfo,
    );

    // Only inline-content blocks can merge, and merging into an empty block
    // is handled elsewhere (by deleting the empty block instead). Merging
    // into or out of container blocks (columnLists, callouts, ...) is
    // intentionally unsupported; the container-boundary Backspace/Delete
    // branches in `KeyboardShortcutsExtension` handle those cases by moving
    // blocks across the boundary instead of merging their content.
    if (
      !bottomNestedBlockInfo.hasContent ||
      bottomNestedBlockInfo.contentKind !== "inline" ||
      bottomNestedBlockInfo.isContentEmpty ||
      !nextBlockInfo.hasContent ||
      nextBlockInfo.contentKind !== "inline"
    ) {
      return false;
    }

    // Un-nests the next block's children by one level, so they survive as
    // siblings of the merged block rather than as children of a block that no
    // longer exists once the boundary below is deleted.
    //
    // Note `state.tr` is tiptap's chainable state, whose getter returns the one
    // transaction shared by the command chain (not a fresh `Transaction` like
    // `EditorState.tr`), so this lift carries over into the `dispatch` below.
    if (dispatch && nextBlockInfo.children) {
      const childBlocksRange = state.doc
        .resolve(nextBlockInfo.children.childrenStart)
        .blockRange(state.doc.resolve(nextBlockInfo.children.childrenEnd));

      // A block's children always sit at the same depth in the same parent, so
      // they form a block range. No range means the doc is malformed, which is
      // a bug rather than a case to merge around.
      if (!childBlocksRange) {
        throw new Error(
          "Children of a block are expected to form a block range",
        );
      }

      state.tr.lift(
        childBlocksRange,
        state.doc.resolve(nextBlockInfo.block.beforePos).depth,
      );
    }

    // Deletes the boundary between the two blocks. Can be thought of as
    // removing the closing tags of the first block and the opening tags of the
    // second one to stitch them together.
    if (dispatch) {
      dispatch(
        state.tr.delete(
          bottomNestedBlockInfo.contentEnd,
          nextBlockInfo.contentStart,
        ),
      );
    }

    return true;
  };
