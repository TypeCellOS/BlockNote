import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";

import { createListOwner } from "./createListOwner.js";

export function getListItemA11yDecorations(
  doc: Node,
  isListItem: (type: string) => boolean,
): DecorationSet {
  const decorations: Decoration[] = [];

  function visit(parent: Node, start: number) {
    let list: { type: string; pos: number; ids: string[] } | undefined;

    function finishList() {
      if (!list) {
        return;
      }
      const { pos, ids } = list;
      decorations.push(
        Decoration.widget(
          pos,
          (view) => createListOwner(view.dom.ownerDocument, ids),
          { side: -1, key: ids.join(" "), ignoreSelection: true },
        ),
      );
      list = undefined;
    }

    parent.forEach((node, offset) => {
      const pos = start + offset;
      const type =
        node.type.name === "blockContainer"
          ? node.firstChild!.type.name
          : undefined;
      if (type && isListItem(type)) {
        if (list && list.type !== type) {
          finishList();
        }
        list ??= { type, pos, ids: [] };
        const id =
          typeof node.attrs.id === "string"
            ? encodeURIComponent(node.attrs.id)
            : `bn-list-item-pos-${pos}`;
        list.ids.push(id);
        // Include the entire block so nested lists belong to their item.
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { id, role: "listitem" }),
        );
      } else {
        finishList();
      }
      if (!node.isLeaf && !node.isTextblock) {
        visit(node, pos + 1);
      }
    });
    finishList();
  }

  visit(doc, 0);
  return DecorationSet.create(doc, decorations);
}
