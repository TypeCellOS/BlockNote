import { Fragment, type Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";

import {
  type BlockInfo,
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getPrevBlockInfo,
  getParentBlockInfo,
} from "../../../getBlockInfoFromPos.js";

/** Returns compatible text to append, or undefined when the blocks cannot merge. */
export function getMergeContent(
  current: Extract<BlockInfo, { hasContent: true }>,
  next: Extract<BlockInfo, { hasContent: true }>,
): Fragment | undefined {
  const inline =
    current.contentKind === "inline" && next.contentKind === "inline";
  const ownedText =
    current.hasOwnedChildren &&
    current.content.node.isTextblock &&
    next.content.node.isTextblock;
  if (!inline && !ownedText) {
    return undefined;
  }
  if (current.contentKind === "plain") {
    const type = current.content.node.type;
    const children: Node[] = [];
    next.content.node.forEach((child) => {
      const text =
        child.type === type.schema.linebreakReplacement
          ? "\n"
          : child.textContent;
      if (text) {
        children.push(type.schema.text(text, type.allowedMarks(child.marks)));
      }
    });
    return Fragment.from(children);
  }
  return next.content.node.content;
}

/**
 * Merges the block starting at `posBetweenBlocks` into the block visually
 * above it, by deleting the boundary between the two.
 *
 * @param posBetweenBlocks The position of the boundary between the two blocks:
 * the position just before the outer node of the block being merged upwards,
 * i.e. its `BlockInfo`'s `block.beforePos`. The block above is found by walking
 * back from there.
 * @returns A tiptap command that returns `false` (leaving the doc untouched)
 * when the two blocks can't merge: no compatible text block above, or the
 * block above is empty (deleting it is handled elsewhere). An owning block
 * can also merge plain text, dropping formatting that its schema disallows.
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

    const prevSibling = getPrevBlockInfo(
      state.doc,
      nextBlockInfo.block.beforePos,
    );
    const parent = prevSibling
      ? undefined
      : getParentBlockInfo(state.doc, nextBlockInfo.block.beforePos);
    // An owned body's first block can merge into its title. Ordinary nested
    // blocks still need a preceding sibling; lifting handles their boundary.
    const prevBlockInfo = prevSibling
      ? getLastDescendantBlockInfo(prevSibling)
      : parent?.hasOwnedChildren
        ? parent
        : undefined;
    if (!prevBlockInfo) {
      return false;
    }

    if (
      !prevBlockInfo.hasContent ||
      prevBlockInfo.isContentEmpty ||
      !nextBlockInfo.hasContent
    ) {
      return false;
    }
    const content = getMergeContent(prevBlockInfo, nextBlockInfo);
    if (content === undefined) {
      return false;
    }

    // Lift children before removing their parent. Tiptap's chainable state
    // returns the shared transaction, so the lift is included in dispatch.
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

    if (dispatch) {
      if (content !== nextBlockInfo.content.node.content) {
        state.tr
          .replaceWith(
            prevBlockInfo.contentEnd,
            nextBlockInfo.contentEnd,
            content,
          )
          .setSelection(
            TextSelection.create(state.tr.doc, prevBlockInfo.contentEnd),
          );
      } else {
        state.tr.delete(prevBlockInfo.contentEnd, nextBlockInfo.contentStart);
      }
      dispatch(state.tr);
    }

    return true;
  };
