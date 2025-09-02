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
 * Calculate the index for a numbered list item based on its position and previous siblings
 */
function calculateListItemIndex(
  node: Node,
  pos: number,
  tr: Transaction,
  map: Map<Node, number>,
): { index: number; isFirst: boolean; hasStart: boolean } {
  let index: number = node.firstChild!.attrs["start"] || 1;
  let isFirst = true;
  const hasStart = !!node.firstChild!.attrs["start"];

  const blockInfo = getBlockInfo({
    posBeforeNode: pos,
    node,
  });

  if (!blockInfo.isBlockContainer) {
    throw new Error("impossible");
  }

  // Check if this block is the start of a new ordered list
  const prevBlock = tr.doc.resolve(blockInfo.bnBlock.beforePos).nodeBefore;
  const prevBlockIndex = prevBlock ? map.get(prevBlock) : undefined;

  if (prevBlockIndex !== undefined) {
    index = prevBlockIndex + 1;
    isFirst = false;
  } else if (prevBlock) {
    // Because we only check the affected ranges, we may need to walk backwards to find the previous block's index
    // We can't just rely on the map, because the map is reset every `apply` call
    const prevBlockInfo = getBlockInfo({
      posBeforeNode: blockInfo.bnBlock.beforePos - prevBlock.nodeSize,
      node: prevBlock,
    });

    const isPrevBlockOrderedListItem =
      prevBlockInfo.blockNoteType === "numberedListItem";
    if (isPrevBlockOrderedListItem) {
      // recurse to get the index of the previous block
      const itemIndex = calculateListItemIndex(
        prevBlock,
        blockInfo.bnBlock.beforePos - prevBlock.nodeSize,
        tr,
        map,
      );
      index = itemIndex.index + 1;
      isFirst = false;
    }
  }
  // Note: we set the map late, so that when we recurse, we can rely on the map to get the previous block's index in one lookup
  map.set(node, index);

  return { index, isFirst, hasStart };
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
  const decorationsToAdd = [] as Deco[];

  tr.doc.nodesBetween(0, tr.doc.nodeSize - 2, (node, pos) => {
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

      // Check if decoration already exists with the same properties (for perf reasons)
      const existingDecorations = nextDecorationSet.find(
        pos,
        pos + node.nodeSize,
        (deco: DecoSpec) =>
          deco.index === index &&
          deco.isFirst === isFirst &&
          deco.hasStart === hasStart,
      );

      if (existingDecorations.length === 0) {
        // Create a widget decoration to display the index
        decorationsToAdd.push(
          // move in by 1 to account for the block container
          Decoration.node(pos + 1, pos + node.nodeSize - 1, {
            "data-index": index.toString(),
          }),
        );
      }
    }
  });

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
        if (
          !tr.docChanged &&
          !tr.selectionSet &&
          previousPluginState.decorations
        ) {
          // Just reuse the existing decorations, since nothing should have changed
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
