import { Fragment } from "prosemirror-model";
import { EditorState, Selection, Transaction } from "prosemirror-state";

import {
  type BlockInfo,
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
} from "../../../getBlockInfoFromPos.js";

type ContentBlockInfo = Extract<BlockInfo, { hasContent: true }>;

/**
 * Whether two blocks can merge: both must hold inline content. Merging into
 * or out of container blocks (columnLists, callouts, ...) is intentionally
 * unsupported; the container-boundary Backspace/Delete branches in
 * `KeyboardShortcutsExtension` move blocks across the boundary instead.
 */
function canMerge(
  prevBlockInfo: BlockInfo,
  nextBlockInfo: BlockInfo,
): prevBlockInfo is ContentBlockInfo {
  return (
    prevBlockInfo.hasContent &&
    prevBlockInfo.contentKind === "inline" &&
    nextBlockInfo.hasContent &&
    nextBlockInfo.contentKind === "inline"
  );
}

/** Merge a first child into its parent, promoting descendants into its place. */
function mergeIntoParent(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  parent: ContentBlockInfo,
  child: ContentBlockInfo,
): boolean {
  if (!parent.children || !canMerge(parent, child)) {
    return false;
  }
  const content = child.content.node.content;
  if (
    content.size > 0 &&
    !parent.content.node.type.validContent(
      parent.content.node.content.append(content),
    )
  ) {
    return false;
  }

  if (dispatch) {
    const tr = state.tr;
    if (parent.children.node.childCount === 1 && !child.children) {
      tr.delete(parent.children.beforePos, parent.children.afterPos);
    } else {
      tr.replaceWith(
        child.block.beforePos,
        child.block.afterPos,
        child.children?.node.content ?? Fragment.empty,
      );
    }
    const cursorPos = parent.contentEnd;
    if (content.size > 0) {
      tr.insert(cursorPos, content);
    }
    tr.setSelection(Selection.near(tr.doc.resolve(cursorPos), -1));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

/**
 * Merges the block starting at `posBetweenBlocks` into the block visually
 * above it, by deleting the boundary between the two.
 *
 * @param posBetweenBlocks The position of the boundary between the two blocks:
 * the position just before the outer node of the block being merged upwards,
 * i.e. its `BlockInfo`'s `block.beforePos`. The block above is found by walking
 * back from there: the previous sibling's deepest descendant, or the parent
 * when the block is its first child.
 * @returns A tiptap command that returns `false` (leaving the doc untouched)
 * when the two blocks can't merge: no block above, or either side isn't an
 * inline-content block.
 */
export const mergeBlocksCommand =
  (posBetweenBlocks: number) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((tr: Transaction) => void) | undefined;
  }) => {
    const nextBlockInfo = getBlockInfoAt(state.doc, posBetweenBlocks);

    const prevBlockInfo = getPrevBlockInfo(
      state.doc,
      nextBlockInfo.block.beforePos,
    );

    if (!prevBlockInfo) {
      if (!nextBlockInfo.hasContent || nextBlockInfo.contentKind !== "inline") {
        return false;
      }
      const parent = getParentBlockInfo(
        state.doc,
        nextBlockInfo.block.beforePos,
      );
      if (!parent?.hasContent) {
        return false;
      }
      return mergeIntoParent(state, dispatch, parent, nextBlockInfo);
    }

    // The block we merge into is the last descendant of the previous block:
    // visually, that's the block directly above the boundary. It may be empty:
    // the text then takes its type and props, as in Notion.
    const bottomNestedBlockInfo = getLastDescendantBlockInfo(prevBlockInfo);
    if (
      !canMerge(bottomNestedBlockInfo, nextBlockInfo) ||
      !nextBlockInfo.hasContent
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
