import { Fragment, type Node, type NodeType } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";

import {
  isContainerNode,
  isNamedOnly,
} from "../../../schema/blocks/children.js";
import { getNodeById } from "../../nodeUtil.js";

/**
 * Default editing policy, separate from schema validity: placeable containers
 * dissolve below their minimum; named-only containers are kept for their
 * parent to repair. Keep the choice here if other behaviors are needed later.
 */
function containerRepairPolicy(type: NodeType): "preserve" | "dissolve" {
  return isNamedOnly(type) ? "preserve" : "dissolve";
}

/**
 * Whether `node` is a container child the user has emptied out: a container
 * (a column, a cell) holding nothing but one empty paragraph, or one holding
 * nothing at all that its content expression requires children.
 * @internal
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
    if (node.childCount === 1) {
      return isEmptyContainerChild(node.firstChild!);
    }
    // A container left with no children at all — its last child was removed
    // and no fill happened on the way. A `min: 0` container in this state is
    // valid and stays; any other is broken structure.
    if (node.childCount === 0) {
      const children = node.type.spec.blockConfig?.children;
      return !!children && (children.min ?? 1) >= 1;
    }
    return false;
  }
  return false;
}

/**
 * Deletes every emptied *container* child of the container at `containerPos`
 * (an emptied column disappears rather than lingering). Regular blocks are
 * left alone: an empty paragraph is content the user typed into, not
 * structure. Dropping below the container's minimum is fine — ProseMirror
 * pads it back and {@link fixContainer} then decides whether the container
 * survives.
 *
 * @param containerPos The position just before the container node.
 */
function removeEmptyChildren(tr: Transaction, containerPos: number) {
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
 * @internal
 */
export function fixContainer(tr: Transaction, containerPos: number) {
  const container = tr.doc.resolve(containerPos).nodeAfter;
  if (!container || !isContainerNode(container.type)) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }

  // A `namedOnly` container (a column) keeps existing: it is its parent's
  // decision whether the container still belongs, and ProseMirror pads it
  // back up to its minimum when children are removed.
  if (containerRepairPolicy(container.type) === "preserve") {
    return;
  }

  removeEmptyChildren(tr, containerPos);

  const fixed = tr.doc.resolve(containerPos).nodeAfter;
  if (!fixed || fixed.type !== container.type) {
    return;
  }

  const childrenConfig = fixed.type.spec.blockConfig?.children;
  const min = childrenConfig ? (childrenConfig.min ?? 1) : 1;

  // Deleting the emptied children can take the container below its minimum, in
  // which case ProseMirror has already padded it back up with empty ones. So
  // "still needed" is decided on the children that carry content, not on the
  // child count.
  const survivors: Node[] = [];
  fixed.forEach((child) => {
    if (!isEmptyContainerChild(child)) {
      survivors.push(child);
    }
  });

  if (survivors.length >= min) {
    return;
  }

  const containerEnd = containerPos + fixed.nodeSize;

  if (survivors.length === 0) {
    tr.delete(containerPos, containerEnd);
    return;
  }

  // Too few children left for the container to mean anything, so it is
  // replaced by its surviving children.
  const replacement: Node[] = [];
  for (const survivor of survivors) {
    if (isNamedOnly(survivor.type)) {
      // The survivor can't stand on its own either (a column only exists
      // inside a column list), so what it holds is what's left.
      survivor.forEach((grandChild) => replacement.push(grandChild));
    } else {
      replacement.push(survivor);
    }
  }

  tr.replaceWith(containerPos, containerEnd, Fragment.from(replacement));
}

/**
 * Runs {@link fixContainer} on each of the given containers, looked up by ID
 * in `tr`'s current doc. Containers are repaired deepest-first so that an
 * inner repair (e.g. a column emptying out) is observed by the outer
 * container's repair (e.g. its columnList unwrapping) in the same pass.
 * Containers that no longer exist by the time their turn comes are skipped —
 * an earlier repair may have removed them.
 */
export function fixContainersById(
  tr: Transaction,
  containers: { id: string; depth: number }[],
) {
  [...containers]
    .sort((a, b) => b.depth - a.depth)
    .forEach(({ id }) => {
      const target = getNodeById(id, tr.doc);
      if (target && isContainerNode(target.node.type)) {
        fixContainer(tr, target.posBeforeNode);
      }
    });
}
