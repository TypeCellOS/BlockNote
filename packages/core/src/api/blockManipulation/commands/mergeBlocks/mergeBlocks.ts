import { Fragment, type Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";

import {
  type BlockInfo,
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
} from "../../../getBlockInfoFromPos.js";

/**
 * Returns compatible text to append, or undefined when the blocks cannot merge.
 * TODO: remove with #3124. A block that is its children's title
 * (`currentIsTitle`) also takes plain text, dropping formatting its schema
 * disallows.
 */
export function getMergeContent(
  current: Extract<BlockInfo, { hasContent: true }>,
  next: Extract<BlockInfo, { hasContent: true }>,
  // TODO: remove with #3124, which makes merging into a parent general.
  currentIsTitle = false,
): Fragment | undefined {
  const inline =
    current.contentKind === "inline" && next.contentKind === "inline";
  // TODO: remove with #3124.
  const titleText =
    currentIsTitle &&
    current.content.node.isTextblock &&
    next.content.node.isTextblock;
  // TODO: remove `titleText` with #3124.
  if (!inline && !titleText) {
    return undefined;
  }
  // TODO: remove with #3124 (only a title reaches here with plain content).
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
 * block above is empty (deleting it is handled elsewhere).
 * @param isTitle TODO: remove with #3124. Whether a block is its children's
 * title (its Enter goes into its children), so that its first child can merge
 * into it.
 */
export const mergeBlocksCommand =
  (
    posBetweenBlocks: number,
    // TODO: remove with #3124, which lets every first child merge into its
    // parent.
    isTitle: (node: Node, doc: Node) => boolean = () => false,
  ) =>
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
    // TODO: remove the `isTitle` branch with #3124. A title's first child can
    // merge into the title. Other first children have no block above to merge
    // into; lifting handles their boundary.
    const prevBlockInfo = prevSibling
      ? getLastDescendantBlockInfo(prevSibling)
      : parent && isTitle(parent.block.node, state.doc)
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
    const content = getMergeContent(
      prevBlockInfo,
      nextBlockInfo,
      // TODO: remove with #3124.
      isTitle(prevBlockInfo.block.node, state.doc),
    );
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
