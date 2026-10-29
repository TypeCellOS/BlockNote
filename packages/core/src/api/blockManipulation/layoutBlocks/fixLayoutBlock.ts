import { Fragment, type Node, Slice } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";

import {
  isLayoutNode,
  isNamedOnly,
  minChildren,
} from "../../../schema/blocks/children.js";
import { getNodeById } from "../../nodeUtil.js";

/**
 * Whether `node` is a layout block child the user has emptied out: a layout block
 * (a column, a cell) holding nothing but one empty paragraph, or one holding
 * nothing at all that its content expression requires children.
 * @internal
 */
export function isEmptyLayoutChild(node: Node): boolean {
  if (node.type.name === "blockContainer") {
    const content = node.firstChild;
    return (
      node.childCount === 1 &&
      !!content &&
      content.type.name === "paragraph" &&
      content.childCount === 0
    );
  }
  if (isLayoutNode(node.type)) {
    if (node.childCount === 1) {
      return isEmptyLayoutChild(node.firstChild!);
    }
    // A layout block left with no children at all: its last child was removed
    // and no fill happened on the way. A `min: 0` layout block in this state is
    // valid and stays; any other is broken structure.
    if (node.childCount === 0) {
      return minChildren(node.type.spec.blockConfig?.children) >= 1;
    }
    return false;
  }
  return false;
}

/**
 * Repairs the layout block at `layoutBlockPos` after children were (re)moved from
 * it: drops the ones the user emptied, and dissolves the layout block when too
 * few are left for it to mean anything (a column list with one column is just
 * that column's blocks).
 *
 * A layout block that only exists inside another layout block (a column) is left to
 * its parent, which is the thing that decides whether it still belongs.
 *
 * @param layoutBlockPos The position just before the layout block node.
 * @internal
 */
export function fixLayoutBlock(tr: Transaction, layoutBlockPos: number) {
  const layoutBlock = tr.doc.resolve(layoutBlockPos).nodeAfter;
  if (!layoutBlock || !isLayoutNode(layoutBlock.type)) {
    throw new Error(
      "Invalid layoutBlockPos: does not point to a layout block node.",
    );
  }

  // A `namedOnly` layout block (a column) keeps existing: it is its parent's
  // decision whether the layout block still belongs, and ProseMirror pads it
  // back up to its minimum when children are removed.
  if (isNamedOnly(layoutBlock.type)) {
    return;
  }

  // A layout block that does not dissolve keeps its empty children, and stays
  // when too few are left: ProseMirror fills it back up to its minimum with
  // empty children (`children.dissolve`).
  const children = layoutBlock.type.spec.blockConfig?.children;
  if (children && "dissolve" in children && children.dissolve === false) {
    return;
  }

  const min = minChildren(layoutBlock.type.spec.blockConfig?.children);
  const survivors: { node: Node; offset: number }[] = [];
  const emptied: { from: number; to: number }[] = [];
  layoutBlock.forEach((child, offset) => {
    if (!isEmptyLayoutChild(child)) {
      survivors.push({ node: child, offset });
    } else if (isLayoutNode(child.type)) {
      const from = layoutBlockPos + 1 + offset;
      emptied.push({ from, to: from + child.nodeSize });
    }
  });

  if (survivors.length >= min) {
    // Keep intentional empty paragraphs. Only remove empty structural children,
    // back to front so positions (and selections in surviving children) stay valid.
    for (const { from, to } of emptied.reverse()) {
      tr.delete(from, to);
    }
    return;
  }

  // Too few children left for the layout block to mean anything, so it is
  // replaced by its surviving children.

  // A single survivor supplying the whole replacement is an unwrap, and doing
  // it as a `ReplaceAroundStep` leaves that content in place in the document:
  // positions inside it - a caret, a collaborator's concurrent edit - map
  // through it, where deleting and reinserting the same content would collapse
  // them onto the edge of the replaced range.
  if (survivors.length === 1) {
    const [{ node: survivor, offset }] = survivors;
    const survivorPos = layoutBlockPos + 1 + offset;
    // A `namedOnly` survivor is lifted out of two wrappers at once - the column
    // and the layout block - and any other survivor out of just the layout block.
    const gap = isNamedOnly(survivor.type)
      ? { from: survivorPos + 1, to: survivorPos + survivor.nodeSize - 1 }
      : { from: survivorPos, to: survivorPos + survivor.nodeSize };

    tr.step(
      new ReplaceAroundStep(
        layoutBlockPos,
        layoutBlockPos + layoutBlock.nodeSize,
        gap.from,
        gap.to,
        Slice.empty,
        0,
        // Not a pure unwrap: emptied siblings sit outside the gap and go with
        // the layout block, which the `structure` check would refuse.
        false,
      ),
    );
    return;
  }

  // Several survivors are not one contiguous range once an emptied child sits
  // between them, so this path rebuilds them and positions inside them
  // collapse. It takes a layout block with a `min` of 3 or more to reach.
  const replacement: Node[] = [];
  for (const { node: survivor } of survivors) {
    if (isNamedOnly(survivor.type)) {
      // The survivor can't stand on its own either (a column only exists
      // inside a column list), so what it holds is what's left.
      survivor.forEach((grandChild) => replacement.push(grandChild));
    } else {
      replacement.push(survivor);
    }
  }

  tr.replaceWith(
    layoutBlockPos,
    layoutBlockPos + layoutBlock.nodeSize,
    Fragment.from(replacement),
  );
}

/**
 * Runs {@link fixLayoutBlock} on each of the given layout blocks, looked up by ID
 * in `tr`'s current doc. Layout blocks are repaired deepest-first so that an
 * inner repair (e.g. a column emptying out) is observed by the outer
 * layout block's repair (e.g. its columnList unwrapping) in the same pass.
 * Layout blocks that no longer exist by the time their turn comes are skipped —
 * an earlier repair may have removed them.
 */
export function fixLayoutBlocksById(
  tr: Transaction,
  layoutBlocks: { id: string; depth: number }[],
) {
  [...layoutBlocks]
    .sort((a, b) => b.depth - a.depth)
    .forEach(({ id }) => {
      const target = getNodeById(id, tr.doc);
      if (target && isLayoutNode(target.node.type)) {
        fixLayoutBlock(tr, target.posBeforeNode);
      }
    });
}
