import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { getBlockInfoFromNode } from "../../api/getBlockInfoFromPos.js";
import { getChangedRangeWithAttrs } from "../../api/getChangedRangeWithAttrs.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createListOwner } from "./createListOwner.js";

// Loosely based on https://github.com/ueberdosis/tiptap/blob/7ac01ef0b816a535e903b5ca92492bff110a71ae/packages/extension-mathematics/src/MathematicsPlugin.ts (MIT)

type ListDecorations = { decorations: DecorationSet };

export const listItemPluginKey = new PluginKey<ListDecorations>(
  "list-item-decorations",
);

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
  const blockInfo = getBlockInfoFromNode(node, pos);
  if (!blockInfo.hasContent) {
    throw new Error("impossible");
  }
  const prevBlock = tr.doc.resolve(blockInfo.block.beforePos).nodeBefore;
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
  let curBeforePos = blockInfo.block.beforePos;

  while (curNode) {
    const cachedIndex = map.get(curNode);
    if (cachedIndex !== undefined) {
      // Found a cached predecessor — start counting from here
      break;
    }
    const curInfo = getBlockInfoFromNode(
      curNode,
      curBeforePos - curNode.nodeSize,
    );
    if (curInfo.blockNoteType !== "numberedListItem") {
      break;
    }
    chain.push({ node: curNode, pos: curBeforePos - curNode.nodeSize });
    const nextPrev = tr.doc.resolve(curInfo.block.beforePos).nodeBefore;
    curBeforePos = curInfo.block.beforePos;
    curNode = nextPrev;
  }

  // Walk forward (reverse of the collected chain) to assign indices
  // The last element in chain is the furthest predecessor
  let index: number;
  let isFirst: boolean;

  // Determine starting index from the block just before the chain
  const lastInChain = chain[chain.length - 1];
  const lastInfo = getBlockInfoFromNode(lastInChain.node, lastInChain.pos);
  if (!lastInfo.hasContent) {
    throw new Error("impossible");
  }
  const predecessorNode = tr.doc.resolve(lastInfo.block.beforePos).nodeBefore;
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
    isFirst:
      chain.length === 1 ? isFirst || predecessorIndex === undefined : false,
    hasStart,
  };
}

/** Map existing decorations and update lists in the affected sibling groups. */
function getDecorations(
  tr: Transaction,
  previousPluginState: ListDecorations,
  isListItem: (type: string) => boolean,
): ListDecorations {
  const map = new Map<Node, number>();
  const nextDecorationSet = previousPluginState.decorations.map(
    tr.mapping,
    tr.doc,
  );
  // Attribute-only steps (e.g. changing a list's start) have empty step maps.
  const range = getChangedRangeWithAttrs(tr) ?? {
    from: 0,
    to: tr.doc.content.size,
  };
  const decorationsToAdd: Decoration[] = [];
  const decorationsToRemove: Decoration[] = [];

  function visit(parent: Node, start: number) {
    // An owner precedes its entire list, so a change in the middle can affect
    // siblings before the changed range. Visit these siblings for ownership,
    // while retaining the original change-scoped numbering and early exit.
    let existingByPosition: Map<number, Decoration[]> | undefined;
    const accessibilityToRemove = new Set<Decoration>();
    let run: { pos: number; type: string; ids: string[] } | undefined;
    let numberingComplete = false;

    // Index mapped decorations once per sibling group. Repeated range queries
    // would scan all the new outer-block role decorations for every item.
    function decorationsAt(pos: number) {
      if (!existingByPosition) {
        existingByPosition = new Map();
        for (const decoration of nextDecorationSet.find(
          start,
          start + parent.content.size,
        )) {
          // Nested lists are maintained by their own sibling traversal.
          const blockPos =
            decoration.spec.index !== undefined
              ? decoration.from - 1
              : decoration.from;
          if (tr.doc.resolve(blockPos).parent !== parent) {
            continue;
          }
          if (decoration.spec.listItem || decoration.spec.listOwner) {
            accessibilityToRemove.add(decoration);
          }
          const atPosition = existingByPosition.get(decoration.from) ?? [];
          atPosition.push(decoration);
          existingByPosition.set(decoration.from, atPosition);
        }
      }
      return existingByPosition.get(pos) ?? [];
    }

    function finishRun() {
      if (!run) {
        return;
      }
      const { pos, ids } = run;
      const key = ids.join(" ");
      const existing = decorationsAt(pos).find((deco) => deco.spec.listOwner);
      if (existing?.spec.key !== key) {
        decorationsToAdd.push(
          Decoration.widget(
            pos,
            (view) => createListOwner(view.dom.ownerDocument, ids),
            { side: -1, key, ignoreSelection: true, listOwner: true },
          ),
        );
      } else {
        accessibilityToRemove.delete(existing);
      }
      run = undefined;
    }

    parent.forEach((node, offset) => {
      const pos = start + offset;
      const type =
        node.type.name === "blockContainer"
          ? node.firstChild!.type.name
          : undefined;
      if (run && run.type !== type) {
        finishRun();
      }
      if (type) {
        const existing = decorationsAt(pos).find((deco) => deco.spec.listItem);
        if (isListItem(type)) {
          // aria-owns is space-separated, so escape caller-supplied IDs.
          const id =
            typeof node.attrs.id === "string"
              ? encodeURIComponent(node.attrs.id)
              : `bn-list-item-pos-${pos}`;
          (run ??= { pos, type, ids: [] }).ids.push(id);
          if (existing?.spec.id === id && existing.to === pos + node.nodeSize) {
            accessibilityToRemove.delete(existing);
          } else {
            // The outer block includes nested lists and non-list children.
            decorationsToAdd.push(
              Decoration.node(
                pos,
                pos + node.nodeSize,
                { id, role: "listitem" },
                { listItem: true, id },
              ),
            );
          }
        }
      }

      if (
        !numberingComplete &&
        pos + node.nodeSize > range.from &&
        type === "numberedListItem"
      ) {
        const { index, isFirst, hasStart } = calculateListItemIndex(
          node,
          pos,
          tr,
          map,
        );
        const blockNode = node.firstChild!;
        const existingDecorations = decorationsAt(pos + 1).filter(
          (deco) => deco.spec.index !== undefined,
        );
        if (
          !existingDecorations.some(
            (deco) =>
              deco.spec.index === index &&
              deco.spec.isFirst === isFirst &&
              deco.spec.hasStart === hasStart,
          )
        ) {
          decorationsToRemove.push(...existingDecorations);
          decorationsToAdd.push(
            Decoration.node(
              pos + 1,
              pos + 1 + blockNode.nodeSize,
              { "data-index": index.toString() },
              { index, isFirst, hasStart },
            ),
          );
        } else if (pos >= range.to) {
          // Subsequent numbered siblings are unchanged, just as in the
          // original indexing plugin. Ownership still needs the full run.
          numberingComplete = true;
        }
      } else if (type && type !== "numberedListItem") {
        // A type change can preserve a mapped node decoration's boundaries.
        decorationsToRemove.push(
          ...decorationsAt(pos + 1).filter(
            (deco) => deco.spec.index !== undefined,
          ),
        );
      }

      // Only changed subtrees need their own sibling groups revisited.
      if (
        !node.isLeaf &&
        !node.isTextblock &&
        pos <= range.to &&
        pos + node.nodeSize >= range.from
      ) {
        visit(node, pos + 1);
      }
    });
    finishRun();
    decorationsToRemove.push(...accessibilityToRemove);
  }

  visit(tr.doc, 0);
  return {
    decorations: nextDecorationSet
      .remove(decorationsToRemove)
      .add(tr.doc, decorationsToAdd),
  };
}

/** Numbers list items and supplies list ownership in both editing modes. */
export const ListItemExtension = createExtension(({ editor }) => {
  function isListItem(type: string) {
    return !!editor.schema.blockSpecs[type]?.implementation.meta.listItem;
  }
  return {
    key: "listItem",
    prosemirrorPlugins: [
      new Plugin<ListDecorations>({
        key: listItemPluginKey,
        state: {
          init: (_, state) =>
            getDecorations(
              state.tr,
              { decorations: DecorationSet.empty },
              isListItem,
            ),
          apply: (tr, previous) =>
            tr.docChanged ? getDecorations(tr, previous, isListItem) : previous,
        },
        props: {
          decorations(state) {
            return listItemPluginKey.getState(state)?.decorations;
          },
        },
      }),
    ],
  };
});
