import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { getBlockInfo } from "../../../api/getBlockInfoFromPos.js";

// Loosely based on https://github.com/ueberdosis/tiptap/blob/7ac01ef0b816a535e903b5ca92492bff110a71ae/packages/extension-mathematics/src/MathematicsPlugin.ts (MIT)

type DecoSpec = {
  index: number;
  isFirst: boolean;
  hasStart: boolean;
  side: number;
};

type Deco = Omit<Decoration, "spec"> & { spec: DecoSpec };

/**
 * Calculate the index for a numbered list item based on its position and previous siblings.
 * Iteratively walks backwards to find the start of the contiguous list (or a cached entry),
 * then walks forward to populate the cache. This avoids deep recursion that would overflow
 * the stack on large documents.
 */
function calculateListItemIndex(
  node: Node,
  pos: number,
  tr: Transaction,
  map: Map<Node, number>,
): { index: number; isFirst: boolean; hasStart: boolean } {
  const hasStart = !!node.firstChild!.attrs["start"];

  // Fast path: previous sibling already in cache
  const blockInfo = getBlockInfo({ posBeforeNode: pos, node });
  if (!blockInfo.isBlockContainer) {
    throw new Error("impossible");
  }
  const prevBlock = tr.doc.resolve(blockInfo.bnBlock.beforePos).nodeBefore;
  const prevBlockIndex = prevBlock ? map.get(prevBlock) : undefined;
  if (prevBlockIndex !== undefined) {
    const index = prevBlockIndex + 1;
    map.set(node, index);
    return { index, isFirst: false, hasStart };
  }

  // Walk backwards iteratively to collect the chain of consecutive
  // numbered list items until we hit a cached entry, a non-list block,
  // or the start of the parent.
  const chain: { node: Node; pos: number }[] = [{ node, pos }];
  let curNode = prevBlock;
  let curBeforePos = blockInfo.bnBlock.beforePos;

  while (curNode) {
    const cachedIndex = map.get(curNode);
    if (cachedIndex !== undefined) {
      // Found a cached predecessor — start counting from here
      break;
    }
    const curInfo = getBlockInfo({
      posBeforeNode: curBeforePos - curNode.nodeSize,
      node: curNode,
    });
    if (curInfo.blockNoteType !== "numberedListItem") {
      break;
    }
    chain.push({ node: curNode, pos: curBeforePos - curNode.nodeSize });
    const nextPrev = tr.doc.resolve(curInfo.bnBlock.beforePos).nodeBefore;
    curBeforePos = curInfo.bnBlock.beforePos;
    curNode = nextPrev;
  }

  // Walk forward (reverse of the collected chain) to assign indices
  // The last element in chain is the furthest predecessor
  let index: number;
  let isFirst: boolean;

  // Determine starting index from the block just before the chain
  const lastInChain = chain[chain.length - 1];
  const lastInfo = getBlockInfo({
    posBeforeNode: lastInChain.pos,
    node: lastInChain.node,
  });
  if (!lastInfo.isBlockContainer) {
    throw new Error("impossible");
  }
  const predecessorNode = tr.doc.resolve(lastInfo.bnBlock.beforePos).nodeBefore;
  const predecessorIndex = predecessorNode
    ? map.get(predecessorNode)
    : undefined;

  if (predecessorIndex !== undefined) {
    index = predecessorIndex;
    isFirst = false;
  } else {
    // Start of a new list
    index = (lastInChain.node.firstChild!.attrs["start"] || 1) - 1;
    isFirst = true;
  }

  // Assign indices from the end of the chain (furthest back) to the front (original node)
  for (let i = chain.length - 1; i >= 0; i--) {
    const entry = chain[i];
    if (isFirst && i < chain.length - 1) {
      // Only the very first item in the list gets isFirst
      isFirst = false;
    }
    index++;
    map.set(entry.node, index);
  }

  // isFirst is true only for the very first item in a new list:
  // chain.length > 1 means we found predecessor list items, so not first.
  return {
    index,
    isFirst: chain.length === 1 ? isFirst || predecessorIndex === undefined : false,
    hasStart,
  };
}

/**
 * Get the decorations for the current state based on the previous state,
 * and the transaction that was applied to get to the current state
 */
function getDecorations(
  tr: Transaction,
  previousPluginState: { decorations: DecorationSet },
) {
  const map = new Map<Node, number>();

  const nextDecorationSet = previousPluginState.decorations.map(
    tr.mapping,
    tr.doc,
  );

  // Find the start of the first change to limit traversal scope.
  // We only need to check from the change point forward, since earlier
  // blocks are unaffected and their mapped decorations remain correct.
  const range = tr.changedRange();
  if (!range) {
    return { decorations: nextDecorationSet };
  }
  const decorationsToAdd = [] as Deco[];

  // Track blockGroups where we've verified a decoration match past the
  // changed range. Within a single blockGroup, indices are sequential —
  // if one matches, all subsequent siblings must too. But sibling items
  // in *other* blockGroups (e.g. nested lists) are independent.
  const completedGroups = new Set<Node>();

  tr.doc.nodesBetween(
    range.from,
    tr.doc.nodeSize - 2,
    (node, pos, parent) => {
      if (parent && completedGroups.has(parent)) {
        return false;
      }

      if (
        node.type.name === "blockContainer" &&
        node.firstChild!.type.name === "numberedListItem"
      ) {
        const { index, isFirst, hasStart } = calculateListItemIndex(
          node,
          pos,
          tr,
          map,
        );

        // Search only the numberedListItem node range, not the full
        // blockContainer (which includes nested blockGroups whose
        // decorations could falsely match).
        const blockNode = tr.doc.nodeAt(pos + 1)!;
        const existingDecorations = nextDecorationSet.find(
          pos + 1,
          pos + 1 + blockNode.nodeSize,
          (deco: DecoSpec) =>
            deco.index === index &&
            deco.isFirst === isFirst &&
            deco.hasStart === hasStart,
        );

        if (existingDecorations.length === 0) {
          decorationsToAdd.push(
            Decoration.node(
              pos + 1,
              pos + 1 + blockNode.nodeSize,
              { "data-index": index.toString() },
              { index, isFirst, hasStart },
            ) as Deco,
          );
        } else if (pos >= range.to && parent) {
          // Past the changed range and decoration matches in this blockGroup:
          // all subsequent siblings must also match. Mark group as done and
          // skip this node's children (nested lists are unaffected too).
          completedGroups.add(parent);
          return false;
        }
      }
      return undefined;
    },
  );

  // Remove any decorations that exist at the same position, they will be replaced by the new decorations
  const decorationsToRemove = decorationsToAdd.flatMap((deco) =>
    nextDecorationSet.find(deco.from, deco.to),
  );

  return {
    decorations: nextDecorationSet
      // Remove existing decorations that are going to be replaced
      .remove(decorationsToRemove)
      // Add any new decorations
      .add(tr.doc, decorationsToAdd),
  };
}

/**
 * This plugin adds decorations to numbered list items to display their index.
 */
export const NumberedListIndexingDecorationPlugin = () => {
  return new Plugin<{ decorations: DecorationSet }>({
    key: new PluginKey("numbered-list-indexing-decorations"),

    state: {
      init(_config, state) {
        // We create an empty transaction to get the decorations for the initial state based on the initial content
        return getDecorations(state.tr, {
          decorations: DecorationSet.empty,
        });
      },
      apply(tr, previousPluginState) {
        if (!tr.docChanged && previousPluginState.decorations) {
          // Selection-only changes don't affect list indices, just reuse existing decorations
          return previousPluginState;
        }
        return getDecorations(tr, previousPluginState);
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
};
