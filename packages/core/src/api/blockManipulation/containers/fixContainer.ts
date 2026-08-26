import { Fragment, Slice, type Node, type NodeType } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";

import {
  type BlockInfo,
  getBlockInfoFromNode,
} from "../../getBlockInfoFromPos.js";

import {
  isBlockGroupInsertable,
  isContainerNode,
  resolveChildren,
} from "../../../schema/blocks/children.js";
import type { ResolvedChildren } from "../../../schema/blocks/children.js";
import type { PartialBlock } from "../../../blocks/defaultBlocks.js";
import { blockToNode } from "../../nodeConversions/blockToNode.js";
import { getNodeById } from "../../nodeUtil.js";

// Defined in `children.ts` (it answers a schema-level question); re-exported
// here because the public root export (`index.ts`) imports it from this
// module.
export { isContainerNode };

export function isEmptyContainerChild(node: Node): boolean {
  if (node.type.name === "blockContainer") {
    const blockContent = node.firstChild;
    return (
      node.childCount === 1 &&
      !!blockContent &&
      blockContent.type.name === "paragraph" &&
      blockContent.childCount === 0
    );
  }
  if (isContainerNode(node.type)) {
    return node.childCount === 1 && isEmptyContainerChild(node.firstChild!);
  }
  return false;
}

export function removeEmptyChildren(tr: Transaction, containerPos: number) {
  const container = tr.doc.resolve(containerPos).nodeAfter;
  if (!container || !isContainerNode(container.type)) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }

  for (
    let childIndex = container.childCount - 1;
    childIndex >= 0;
    childIndex--
  ) {
    const childPos = tr.doc.resolve(containerPos + 1).posAtIndex(childIndex);
    const child = tr.doc.resolve(childPos).nodeAfter;
    if (!child) {
      throw new Error("Invalid childPos: does not point to a child node.");
    }

    if (isEmptyContainerChild(child)) {
      tr.delete(childPos, childPos + child.nodeSize);
    }
  }
}

/**
 * The container's BlockInfo at `containerPos` in `tr`'s current doc, or
 * `undefined` when the node there is gone or no longer of `type`.
 */
function getContainerInfo(
  tr: Transaction,
  containerPos: number,
  type: NodeType,
): Extract<BlockInfo, { hasContent: false }> | undefined {
  const node = tr.doc.resolve(containerPos).nodeAfter;
  if (!node || node.type !== type) {
    return undefined;
  }
  const info = getBlockInfoFromNode(node, containerPos);
  if (info.hasContent) {
    // `type` is a container node type, so its BlockInfo always takes the
    // no-content arm.
    throw new Error(
      `Container node "${type.name}" unexpectedly resolved with a content node.`,
    );
  }
  return info;
}

export function fixContainer(tr: Transaction, containerPos: number) {
  const node = tr.doc.resolve(containerPos).nodeAfter;
  if (!node || !isContainerNode(node.type)) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }

  const blockConfig = node.type.spec.blockConfig;
  const childrenConfig = blockConfig?.children;
  const config = childrenConfig ? resolveChildren(childrenConfig) : undefined;

  if (!config) {
    return;
  }

  if (config.whenEmptied === "unwrap") {
    unwrapContainer(tr, containerPos, node.type, config);
  } else {
    refillContainer(tr, containerPos, node.type, config);
  }
}

function unwrapContainer(
  tr: Transaction,
  containerPos: number,
  type: NodeType,
  config: ResolvedChildren,
) {
  // Emptied children are dropped unconditionally, even when the container
  // sits at or above `min` afterwards: for an unwrap container (a
  // columnList), a child the user emptied is done for — an emptied third
  // column disappears rather than lingering. This deliberately differs from
  // `refillContainer`, which leaves empty children alone at or above `min`.
  removeEmptyChildren(tr, containerPos);

  const info = getContainerInfo(tr, containerPos, type);
  if (!info) {
    return;
  }
  const { childrenStart } = info.children;

  const nonEmptyChildren: { child: Node; offset: number }[] = [];
  info.children.node.forEach((child, offset) => {
    if (!isEmptyContainerChild(child)) {
      nonEmptyChildren.push({ child, offset });
    }
  });

  if (nonEmptyChildren.length >= config.min) {
    return;
  }

  const blockEnd = info.block.afterPos;

  if (nonEmptyChildren.length === 0) {
    tr.delete(info.block.beforePos, blockEnd);
    return;
  }

  // Unwrap: replace the container with its remaining non-empty children.
  if (nonEmptyChildren.length === 1) {
    const { child, offset } = nonEmptyChildren[0];
    const childStart = childrenStart + offset;

    const [gapFrom, gapTo] = isBlockGroupInsertable(child.type)
      ? [childStart, childStart + child.nodeSize]
      : [childStart + 1, childStart + child.nodeSize - 1];

    tr.step(
      new ReplaceAroundStep(
        info.block.beforePos,
        blockEnd,
        gapFrom,
        gapTo,
        Slice.empty,
        0,
        false,
      ),
    );
    return;
  }

  // Several survivors but still below `min`: rebuild replacement content.
  const replacement: Node[] = [];
  for (const { child } of nonEmptyChildren) {
    if (isBlockGroupInsertable(child.type)) {
      replacement.push(child);
    } else {
      child.forEach((grandChild) => replacement.push(grandChild));
    }
  }
  tr.replaceWith(info.block.beforePos, blockEnd, Fragment.from(replacement));
}

/**
 * The `whenEmptied: "refill"` repair: when fewer than `min` non-empty
 * children remain, drop the emptied ones and top the container back up.
 * Position `k..min-1` (k = surviving count) is seeded from the container's
 * `default`, falling back to `fillBefore`-style empty fill when `default` is
 * absent. Deterministic, appended at the end.
 *
 * Rebuilt in a single replace: removing an empty child first would make
 * ProseMirror's schema fitting instantly pad the container back to `min` with
 * a fresh empty child, hiding the deficit from the seeding step.
 */
function refillContainer(
  tr: Transaction,
  containerPos: number,
  type: NodeType,
  config: ResolvedChildren,
) {
  const info = getContainerInfo(tr, containerPos, type);
  if (!info) {
    return;
  }
  const { node: children, childrenStart, childrenEnd } = info.children;

  const survivors: Node[] = [];
  children.forEach((child) => {
    if (!isEmptyContainerChild(child)) {
      survivors.push(child);
    }
  });
  // At or above the minimum, empty children are left alone: they may be
  // intentional.
  if (survivors.length >= config.min) {
    return;
  }

  // The refill seeds are the unconsumed tail of the container's `default`
  // (`default[survivors.length..min-1]`), each converted exactly like an
  // inserted block. Empty when the container has no `default`; the remainder
  // is padded with empty fill below.
  const seeds = (config.default ?? [])
    .slice(survivors.length, config.min)
    .map((child) =>
      blockToNode(child as PartialBlock<any, any, any>, tr.doc.type.schema),
    );

  if (seeds.length === 0) {
    // No `default` to seed from, so empty children are the right fill, and
    // ProseMirror's schema fitting has usually already padded the container
    // back to `min` with them. Complete the fill only when it hasn't.
    const match = children.type.contentMatch.matchFragment(children.content);
    const fill = match?.fillBefore(Fragment.empty, true);
    if (fill && fill.size > 0) {
      tr.insert(childrenEnd, fill);
    }
    return;
  }

  // Survivors keep their place; the seeds land at the end, replacing the
  // emptied (or schema-padded) children.
  let content = Fragment.from([...survivors, ...seeds]);
  const match = children.type.contentMatch.matchFragment(content);
  const fill = match?.fillBefore(Fragment.empty, true);
  if (fill) {
    content = content.append(fill);
  }

  tr.replaceWith(childrenStart, childrenEnd, content);
}

/**
 * Runs `fixContainer` on each of the given containers, looked up by ID in
 * `tr`'s current doc. Containers are repaired deepest-first so that an inner
 * repair (e.g. a column emptying out) is observed by the outer container's
 * repair (e.g. its columnList unwrapping) in the same pass. Containers that
 * no longer exist by the time their turn comes are skipped — an earlier
 * repair may have removed them.
 */
export function fixContainersById(
  tr: Transaction,
  containers: { id: string; depth: number }[],
) {
  [...containers]
    .sort((a, b) => b.depth - a.depth)
    .forEach(({ id }) => {
      const target = getNodeById(id, tr.doc);
      if (!target) {
        return;
      }
      fixContainer(tr, target.posBeforeNode);
    });
}
