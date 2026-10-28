import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { getChangedRangeWithAttrs } from "../../api/getChangedRangeWithAttrs.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createListOwner } from "./createListOwner.js";

// Loosely based on https://github.com/ueberdosis/tiptap/blob/7ac01ef0b816a535e903b5ca92492bff110a71ae/packages/extension-mathematics/src/MathematicsPlugin.ts (MIT)

type ListDecorations = { decorations: DecorationSet };

export const listItemPluginKey = new PluginKey<ListDecorations>(
  "list-item-decorations",
);

type ListChain = { pos: number; ids: string[] };
type ListItemInfo = {
  index: number | undefined;
  isFirst: boolean;
  hasStart: boolean;
  chain: ListChain;
};

function blockType(node: Node | null) {
  return node?.type.name === "blockContainer"
    ? node.firstChild!.type.name
    : undefined;
}

/** Walk back to a cached sibling or the start of the same-type list, then
 * populate the cache forwards. Each item's ID is collected exactly once. */
function getListItemInfo(
  node: Node,
  pos: number,
  tr: Transaction,
  map: Map<Node, ListItemInfo>,
): ListItemInfo {
  const cached = map.get(node);
  if (cached) {
    return cached;
  }

  const type = blockType(node);
  const pending: { node: Node; pos: number }[] = [];
  let current: Node | null = node;
  let previous: ListItemInfo | undefined;
  while (current && blockType(current) === type) {
    previous = map.get(current);
    if (previous) {
      break;
    }
    pending.push({ node: current, pos });
    current = tr.doc.resolve(pos).nodeBefore;
    pos -= current?.nodeSize ?? 0;
  }

  const chain = previous?.chain ?? {
    pos: pending[pending.length - 1].pos,
    ids: [],
  };
  for (let i = pending.length - 1; i >= 0; i--) {
    const entry = pending[i];
    const start = entry.node.firstChild!.attrs.start;
    previous = {
      index:
        type === "numberedListItem"
          ? previous?.index !== undefined
            ? previous.index + 1
            : start || 1
          : undefined,
      isFirst: i === pending.length - 1 && chain.ids.length === 0,
      hasStart: !!start,
      chain,
    };
    // aria-owns is space-separated, so escape caller-supplied IDs.
    chain.ids.push(
      typeof entry.node.attrs.id === "string"
        ? encodeURIComponent(entry.node.attrs.id)
        : `bn-list-item-pos-${entry.pos}`,
    );
    map.set(entry.node, previous);
  }
  return map.get(node)!;
}

function getDecorations(
  tr: Transaction,
  previousPluginState: ListDecorations,
  isListItem: (type: string) => boolean,
): ListDecorations {
  const map = new Map<Node, ListItemInfo>();
  const nextDecorationSet = previousPluginState.decorations.map(
    tr.mapping,
    tr.doc,
  );
  const range = getChangedRangeWithAttrs(tr) ?? {
    from: 0,
    to: tr.doc.content.size,
  };
  const decorationsToAdd: Decoration[] = [];
  const decorationsToRemove = new Set<Decoration>();
  const chains = new Set<ListChain>();
  const completedGroups = new Set<Node>();

  // Looking up each item with DecorationSet.find would repeatedly scan all
  // the outer-block role decorations. Index the mapped decorations once.
  const existing = new Map<number, Decoration[]>();
  for (const decoration of nextDecorationSet.find()) {
    const atPosition = existing.get(decoration.from) ?? [];
    atPosition.push(decoration);
    existing.set(decoration.from, atPosition);
    const type = blockType(tr.doc.resolve(decoration.from).nodeAfter);
    // A widget can survive deletion of the last item at a group's end.
    if (decoration.spec.listOwner && (!type || !isListItem(type))) {
      decorationsToRemove.add(decoration);
    }
  }

  tr.doc.nodesBetween(
    Math.max(0, range.from - 1),
    tr.doc.content.size,
    (node, pos, parent) => {
      if (parent && completedGroups.has(parent)) {
        return false;
      }
      const type = blockType(node);
      const atPosition = existing.get(pos) ?? [];

      // Splitting/deleting a list can change its preceding owner without
      // visiting that first item. Collect the remaining prefix as well.
      if (pos <= range.to) {
        const before = tr.doc.resolve(pos).nodeBefore;
        const beforeType = blockType(before);
        if (before && beforeType && isListItem(beforeType)) {
          chains.add(
            getListItemInfo(before, pos - before.nodeSize, tr, map).chain,
          );
        }
      }
      if (!type || !isListItem(type)) {
        for (const deco of atPosition) {
          if (deco.spec.listItem || deco.spec.listOwner) {
            decorationsToRemove.add(deco);
          }
        }
        if (type) {
          for (const deco of existing.get(pos + 1) ?? []) {
            decorationsToRemove.add(deco);
          }
        }
        return;
      }

      const { index, isFirst, hasStart, chain } = getListItemInfo(
        node,
        pos,
        tr,
        map,
      );
      chains.add(chain);
      const id = chain.ids[chain.ids.length - 1];
      const item = atPosition.find((deco) => deco.spec.listItem);
      let matches = item?.spec.id === id && item.to === pos + node.nodeSize;
      if (!matches) {
        if (item) {
          decorationsToRemove.add(item);
        }
        decorationsToAdd.push(
          Decoration.node(
            pos,
            pos + node.nodeSize,
            { id, role: "listitem" },
            { listItem: true, id },
          ),
        );
      }
      if (!isFirst) {
        for (const deco of atPosition) {
          if (deco.spec.listOwner) {
            decorationsToRemove.add(deco);
          }
        }
      }

      const numbered = existing.get(pos + 1) ?? [];
      if (index !== undefined) {
        const numberMatches = numbered.some(
          (deco) =>
            deco.spec.index === index &&
            deco.spec.isFirst === isFirst &&
            deco.spec.hasStart === hasStart,
        );
        matches &&= numberMatches;
        if (!numberMatches) {
          numbered.forEach((deco) => decorationsToRemove.add(deco));
          decorationsToAdd.push(
            Decoration.node(
              pos + 1,
              pos + 1 + node.firstChild!.nodeSize,
              { "data-index": String(index) },
              { index, isFirst, hasStart },
            ),
          );
        }
      } else {
        numbered.forEach((deco) => decorationsToRemove.add(deco));
      }

      // As in the original indexing plugin, stop after a matching item past
      // the change, but finish its chain so the owner's IDs are complete.
      const next = tr.doc.resolve(pos + node.nodeSize).nodeAfter;
      if (matches && pos >= range.to && parent && blockType(next) !== type) {
        completedGroups.add(parent);
        return false;
      }
      return undefined;
    },
  );

  for (const { pos, ids } of chains) {
    const key = ids.join(" ");
    const owner = (existing.get(pos) ?? []).find((deco) => deco.spec.listOwner);
    if (owner?.spec.key === key) {
      continue;
    }
    if (owner) {
      decorationsToRemove.add(owner);
    }
    decorationsToAdd.push(
      Decoration.widget(
        pos,
        (view) => createListOwner(view.dom.ownerDocument, ids),
        { side: -1, key, ignoreSelection: true, listOwner: true },
      ),
    );
  }

  return {
    decorations: nextDecorationSet
      .remove([...decorationsToRemove])
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
