import { Fragment, type Node } from "prosemirror-model";
import {
  EditorState,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";

import {
  type BlockInfo,
  getBlockInfoAt,
  getLastDescendantBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
} from "../../../getBlockInfoFromPos.js";

type ContentBlockInfo = Extract<BlockInfo, { hasContent: true }>;

/** Returns compatible text to append, or undefined when the blocks cannot merge. */
export function getMergeContent(
  current: ContentBlockInfo,
  next: ContentBlockInfo,
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

/** Merge a first child into its parent, promoting descendants into its place. */
function mergeIntoParent(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  parent: ContentBlockInfo,
  child: ContentBlockInfo,
): boolean {
  if (!parent.children) {
    return false;
  }
  const content = getMergeContent(parent, child);
  if (
    content === undefined ||
    (content.size > 0 &&
      !parent.content.node.type.validContent(
        parent.content.node.content.append(content),
      ))
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
 * when the two blocks can't merge: no compatible text block above. The block
 * above may be empty: the text then takes its type and props, as in Notion.
 * An owning block can also merge plain text, dropping formatting that its
 * schema disallows.
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
    if (!nextBlockInfo.hasContent) {
      return false;
    }

    const prevSibling = getPrevBlockInfo(
      state.doc,
      nextBlockInfo.block.beforePos,
    );
    if (!prevSibling) {
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
    // visually, that's the block directly above the boundary.
    const prevBlockInfo = getLastDescendantBlockInfo(prevSibling);
    if (!prevBlockInfo.hasContent) {
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
