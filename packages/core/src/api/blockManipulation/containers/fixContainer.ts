import { Slice, type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";

import {
  containerDissolves,
  isContainerNode,
  isContainerOnly,
  minChildren,
} from "../../../schema/blocks/containers.js";
import { getNodeById } from "../../nodeUtil.js";

/**
 * Whether `node` is a container child the user has emptied out: a container
 * (a column, a cell) holding nothing but one empty paragraph.
 */
export function isEmptyContainerChild(node: Node): boolean {
  if (node.type.name === "blockContainer") {
    const content = node.firstChild;
    return (
      node.childCount === 1 &&
      !!content &&
      content.type.name === "paragraph" &&
      content.childCount === 0
    );
  }
  if (isContainerNode(node.type)) {
    return node.childCount === 1 && isEmptyContainerChild(node.firstChild!);
  }
  return false;
}

/**
 * Deletes every emptied *container* child of the container at `containerPos`
 * (an emptied column disappears rather than lingering). Regular blocks are
 * left alone: an empty paragraph is content the user typed into, not
 * structure. Dropping below the container's minimum is fine - ProseMirror pads
 * it back and {@link fixContainer} then decides whether the container survives.
 *
 * @param containerPos The position just before the container node.
 */
export function removeEmptyChildren(tr: Transaction, containerPos: number) {
  const container = tr.doc.resolve(containerPos).nodeAfter;
  if (!container || !isContainerNode(container.type)) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }

  // Collected before deleting anything, then applied back to front so the
  // earlier positions stay valid.
  const emptied: { from: number; to: number }[] = [];
  container.forEach((child, offset) => {
    if (isContainerNode(child.type) && isEmptyContainerChild(child)) {
      const from = containerPos + 1 + offset;
      emptied.push({ from, to: from + child.nodeSize });
    }
  });

  for (let i = emptied.length - 1; i >= 0; i--) {
    tr.delete(emptied[i].from, emptied[i].to);
  }
}

/**
 * Repairs the container at `containerPos` after children were (re)moved from
 * it: drops the ones the user emptied, and dissolves the container when too
 * few are left for it to mean anything (a column list with one column is just
 * that column's blocks).
 *
 * A container that only exists inside another container (a column) is left to
 * its parent, which is the thing that decides whether it still belongs.
 *
 * @param containerPos The position just before the container node.
 */
export function fixContainer(tr: Transaction, containerPos: number) {
  const container = tr.doc.resolve(containerPos).nodeAfter;
  if (!container || !isContainerNode(container.type)) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }
  if (!containerDissolves(container.type)) {
    return;
  }

  removeEmptyChildren(tr, containerPos);

  const fixed = tr.doc.resolve(containerPos).nodeAfter;
  if (!fixed || fixed.type !== container.type) {
    return;
  }

  // Deleting the emptied children can take the container below its minimum, in
  // which case ProseMirror has already padded it back up with empty ones. So
  // "still needed" is decided on the children that carry content, not on the
  // child count.
  const survivors: { node: Node; offset: number }[] = [];
  fixed.forEach((child, offset) => {
    if (!isEmptyContainerChild(child)) {
      survivors.push({ node: child, offset });
    }
  });

  if (survivors.length >= minChildren(fixed.type)) {
    return;
  }

  const containerEnd = containerPos + fixed.nodeSize;

  if (survivors.length === 0) {
    tr.delete(containerPos, containerEnd);
    return;
  }

  // Too few children left for the container to mean anything, so it is
  // replaced by the one that still has content.
  const { node: survivor, offset } = survivors[0];
  const survivorStart = containerPos + 1 + offset;

  if (isContainerOnly(survivor.type)) {
    // The survivor can't stand on its own either (a column only exists inside
    // a column list), so what it holds is what's left.
    tr.step(
      new ReplaceAroundStep(
        containerPos,
        containerEnd,
        survivorStart + 1,
        survivorStart + survivor.nodeSize - 1,
        Slice.empty,
        0,
        false,
      ),
    );
    return;
  }

  tr.replaceWith(containerPos, containerEnd, survivor);
}

/**
 * The container blocks `pos` sits in, innermost first, as ids: repairs happen
 * after the change that prompted them, by which time positions have moved but
 * ids still name the same blocks.
 */
export function containerAncestorIds(doc: Node, pos: number): string[] {
  const $pos = doc.resolve(pos);
  const ids: string[] = [];
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth);
    if (isContainerNode(ancestor.type) && ancestor.attrs.id) {
      ids.push(ancestor.attrs.id);
    }
  }
  return ids;
}

/**
 * Repairs each of the given containers, looked up by id in the transaction's
 * current document. Innermost first, so an inner container emptying out is
 * seen by the outer one; containers an earlier repair already removed are
 * skipped.
 */
export function fixContainersById(tr: Transaction, ids: Iterable<string>) {
  for (const id of ids) {
    const target = getNodeById(id, tr.doc);
    if (target && isContainerNode(target.node.type)) {
      fixContainer(tr, target.posBeforeNode);
    }
  }
}
