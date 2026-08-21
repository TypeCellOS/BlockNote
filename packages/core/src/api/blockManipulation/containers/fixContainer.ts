import { Fragment, Slice, type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";
import type { Schema } from "prosemirror-model";

import {
  BLOCK_GROUP_CHILD_GROUP,
  blockTypeOfContainerChildrenNode,
  getChildrenConfig,
  isContainerNode,
  isContentContainerNode,
  resolveChildren,
} from "../../../schema/blocks/children.js";
import type { ResolvedChildren } from "../../../schema/blocks/children.js";
import { seedRefillChildren } from "../../nodeConversions/blockToNode.js";
import { getNodeById } from "../../nodeUtil.js";
import { fixColumnList } from "../commands/replaceBlocks/util/fixColumnList.js";

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

function isInsertableChild(node: Node): boolean {
  return (
    node.type.name === "blockContainer" ||
    node.type.isInGroup(BLOCK_GROUP_CHILD_GROUP)
  );
}

type ContainerRepairTarget = {
  blockPos: number;
  blockNode: Node;
  childrenPos: number;
  contentNode: Node | undefined;
};

function getContainerRepairTarget(
  doc: Node,
  containerPos: number,
): ContainerRepairTarget | undefined {
  const node = doc.resolve(containerPos).nodeAfter;
  if (!node) {
    return undefined;
  }

  if (isContentContainerNode(node)) {
    const contentNode = node.firstChild!;
    return {
      blockPos: containerPos,
      blockNode: node,
      childrenPos: containerPos + 1 + contentNode.nodeSize,
      contentNode,
    };
  }

  if (!isContainerNode(node.type)) {
    return undefined;
  }

  // A `__children` node: normalize to the block that owns it.
  if (blockTypeOfContainerChildrenNode(node.type.name)) {
    return getContainerRepairTarget(doc, doc.resolve(containerPos).before());
  }

  return {
    blockPos: containerPos,
    blockNode: node,
    childrenPos: containerPos,
    contentNode: undefined,
  };
}

/**
 * The (possibly rebuilt) block at the repair target, with where its children
 * now live and where they start. Recomputed after each mutation of `tr`.
 */
function refreshRepairTarget(
  tr: Transaction,
  target: ContainerRepairTarget,
): { children: Node; childrenStart: number } | undefined {
  const refreshedBlock = tr.doc.resolve(target.blockPos).nodeAfter;
  if (!refreshedBlock || refreshedBlock.type !== target.blockNode.type) {
    return undefined;
  }

  return target.contentNode
    ? {
        children: refreshedBlock.lastChild!,
        childrenStart:
          target.blockPos + 1 + refreshedBlock.firstChild!.nodeSize + 1,
      }
    : { children: refreshedBlock, childrenStart: target.blockPos + 1 };
}

export function fixContainer(tr: Transaction, containerPos: number) {
  const target = getContainerRepairTarget(tr.doc, containerPos);
  if (!target) {
    throw new Error(
      "Invalid containerPos: does not point to a container node.",
    );
  }

  const blockConfig = target.blockNode.type.spec.blockConfig;
  const childrenConfig = blockConfig
    ? getChildrenConfig(blockConfig)
    : undefined;
  const config = childrenConfig ? resolveChildren(childrenConfig) : undefined;

  if (!config) {
    // Legacy repair for `@blocknote/xl-multi-column`'s hand-written PM nodes,
    // which have no `children` config but sit in the `childContainer` group.
    // Removed once multi-column is migrated onto the container API.
    if (target.blockNode.type.name === "columnList") {
      fixColumnList(tr, target.blockPos);
    }
    return;
  }

  if (config.whenEmptied === "unwrap") {
    // Unwrapping an emptied content-bearing container deletes the whole block,
    // so don't run it while the container's own content is non-empty. (Refill
    // only rewrites the `__children` node and never touches `__content`, so it
    // is safe regardless.)
    if (target.contentNode && target.contentNode.content.size > 0) {
      return;
    }
    unwrapContainer(tr, target, config);
  } else {
    // `blockConfig` is set whenever `config` is.
    refillContainer(tr, target, config, blockConfig!.type);
  }
}

function unwrapContainer(
  tr: Transaction,
  target: ContainerRepairTarget,
  config: ResolvedChildren,
) {
  removeEmptyChildren(tr, target.childrenPos);

  const refreshed = refreshRepairTarget(tr, target);
  if (!refreshed) {
    return;
  }
  const { children: refreshedChildren, childrenStart } = refreshed;

  const nonEmptyChildren: { child: Node; offset: number }[] = [];
  refreshedChildren.forEach((child, offset) => {
    if (!isEmptyContainerChild(child)) {
      nonEmptyChildren.push({ child, offset });
    }
  });

  if (nonEmptyChildren.length >= config.min) {
    return;
  }

  const refreshedBlock = tr.doc.resolve(target.blockPos).nodeAfter!;
  const blockEnd = target.blockPos + refreshedBlock.nodeSize;

  if (nonEmptyChildren.length === 0) {
    tr.delete(target.blockPos, blockEnd);
    return;
  }

  // Unwrap: replace the container with its remaining non-empty children.
  if (nonEmptyChildren.length === 1) {
    const { child, offset } = nonEmptyChildren[0];
    const childStart = childrenStart + offset;

    const [gapFrom, gapTo] = isInsertableChild(child)
      ? [childStart, childStart + child.nodeSize]
      : [childStart + 1, childStart + child.nodeSize - 1];

    tr.step(
      new ReplaceAroundStep(
        target.blockPos,
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
    if (isInsertableChild(child)) {
      replacement.push(child);
    } else {
      child.forEach((grandChild) => replacement.push(grandChild));
    }
  }
  tr.replaceWith(target.blockPos, blockEnd, Fragment.from(replacement));
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
  target: ContainerRepairTarget,
  config: ResolvedChildren,
  blockType: string,
) {
  const current = refreshRepairTarget(tr, target);
  if (!current) {
    return;
  }
  const { children, childrenStart } = current;

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

  const seeds = seedRefillChildren(
    blockType,
    tr.doc.type.schema,
    survivors.length,
    config.min,
  );

  if (seeds.length === 0) {
    // No `default` to seed from, so empty children are the right fill, and
    // ProseMirror's schema fitting has usually already padded the container
    // back to `min` with them. Complete the fill only when it hasn't.
    const match = children.type.contentMatch.matchFragment(children.content);
    const fill = match?.fillBefore(Fragment.empty, true);
    if (fill && fill.size > 0) {
      tr.insert(childrenStart + children.content.size, fill);
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

  tr.replaceWith(childrenStart, childrenStart + children.content.size, content);
}

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

export function flattenNonInsertableBlocks<
  T extends { type?: string; content?: unknown; children?: T[] },
>(blocks: T[], pmSchema: Schema): T[] {
  return blocks.flatMap((block) => {
    const nodeType = block.type ? pmSchema.nodes[block.type] : undefined;
    if (
      nodeType &&
      nodeType.isInGroup("bnBlock") &&
      !nodeType.isInGroup(BLOCK_GROUP_CHILD_GROUP)
    ) {
      const children = flattenNonInsertableBlocks(
        block.children ?? [],
        pmSchema,
      );
      return Array.isArray(block.content) && block.content.length > 0
        ? [
            { type: "paragraph", content: block.content } as unknown as T,
            ...children,
          ]
        : children;
    }
    return [block];
  });
}
