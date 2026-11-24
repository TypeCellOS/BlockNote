import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Loosely based on https://github.com/ueberdosis/tiptap/blob/7ac01ef0b816a535e903b5ca92492bff110a71ae/packages/extension-mathematics/src/MathematicsPlugin.ts (MIT)

type DecoSpec = {
  index: number;
  isFirst: boolean;
  hasStart: boolean;
  side: number;
};

type Deco = Omit<Decoration, "spec"> & { spec: DecoSpec };

function getNumberedListItem(node: Node) {
  const content = node.firstChild;
  return node.type.name === "blockContainer" &&
    content?.type.name === "numberedListItem"
    ? content
    : undefined;
}

/**
 * Calculate the index for a numbered list item based on its position and previous siblings.
 * Walk backward by sibling index: resolving each predecessor's document position
 * would scan from the start of the same fragment every time.
 */
function calculateListItemIndex(
  parent: Node,
  childIndex: number,
  item: Node,
  map: Map<Node, number>,
) {
  let first = childIndex;
  let firstItem = item;
  let indexBeforeRun: number | undefined;
  while (first > 0) {
    const previous = parent.child(first - 1);
    indexBeforeRun = map.get(previous);
    if (indexBeforeRun !== undefined) {
      break;
    }
    const previousItem = getNumberedListItem(previous);
    if (!previousItem) {
      break;
    }
    first--;
    firstItem = previousItem;
  }

  // Fill the transaction-local cache forward starting at the first uncached
  // item. A list's explicit start applies only when there is no predecessor.
  let index = indexBeforeRun ?? (firstItem.attrs["start"] || 1) - 1;
  for (let i = first; i <= childIndex; i++) {
    index++;
    map.set(parent.child(i), index);
  }

  return {
    index,
    isFirst: first === childIndex && indexBeforeRun === undefined,
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
  // On init (no steps), changedRange() returns null — fall back to a
  // full scan so initial content gets indexed.
  const range = tr.changedRange() ?? { from: 0, to: tr.doc.nodeSize - 2 };
  const decorationsToAdd = [] as Deco[];

  // Track blockGroups where we've verified a decoration match past the
  // changed range. Within a single blockGroup, indices are sequential —
  // if one matches, all subsequent siblings must too. But sibling items
  // in *other* blockGroups (e.g. nested lists) are independent.
  const completedGroups = new Set<Node>();

  tr.doc.nodesBetween(
    range.from,
    tr.doc.nodeSize - 2,
    (node, pos, parent, childIndex) => {
      if (parent && completedGroups.has(parent)) {
        return false;
      }

      const blockNode = getNumberedListItem(node);
      if (parent && blockNode) {
        const { index, isFirst } = calculateListItemIndex(
          parent,
          childIndex,
          blockNode,
          map,
        );
        const hasStart = !!blockNode.attrs["start"];

        // Search only the numberedListItem node range, not the full
        // blockContainer (which includes nested blockGroups whose
        // decorations could falsely match).
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
        } else if (pos >= range.to) {
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
