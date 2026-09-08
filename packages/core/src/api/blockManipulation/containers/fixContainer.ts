import { Fragment, type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";

import {
  isContainerNode,
  isNamedOnly,
} from "../../../schema/blocks/children.js";
import { getNodeById } from "../../nodeUtil.js";

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
  if (isNamedOnly(container.type)) {
    return;
  }

  const childrenConfig = container.type.spec.blockConfig?.children;
  const min = childrenConfig ? (childrenConfig.min ?? 1) : 1;
  const survivors: Node[] = [];
  const emptied: { from: number; to: number }[] = [];
  container.forEach((child, offset) => {
    if (!isEmptyContainerChild(child)) {
      survivors.push(child);
    } else if (isContainerNode(child.type)) {
      const from = containerPos + 1 + offset;
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

  tr.replaceWith(
    containerPos,
    containerPos + container.nodeSize,
    Fragment.from(replacement),
  );
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
