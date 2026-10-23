import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { createExtension } from "../../editor/BlockNoteExtension.js";
import { UniqueID } from "../tiptap-extensions/UniqueID/UniqueID.js";

import {
  createListOwner,
  walkListSiblings,
  type ListSibling,
} from "./listItems.js";

type ListDecorations = {
  decorations: DecorationSet;
  readOnlyDecorations: DecorationSet;
};

export const listItemPluginKey = new PluginKey<ListDecorations>(
  "list-item-decorations",
);

/** Numbers list items and supplies list ownership in read-only mode. */
export const ListItemExtension = createExtension(({ editor }) => {
  let prefix: string | undefined;

  function decorate(doc: Node): ListDecorations {
    const decorations: Decoration[] = [];
    const accessibilityDecorations: Decoration[] = [];

    function visit(parent: Node, start: number) {
      type Item = { node: Node; pos: number };
      function* siblings(): Iterable<ListSibling<Item>> {
        let pos = start;
        for (let i = 0; i < parent.childCount; i++) {
          const node = parent.child(i);
          const type =
            node.type.name === "blockContainer"
              ? node.firstChild?.type.name
              : undefined;
          yield {
            item: { node, pos },
            type,
            start: node.firstChild?.attrs.start,
            listItem: !!(
              type &&
              editor.schema.blockSpecs[type]?.implementation.meta.listItem
            ),
          };
          if (!node.isLeaf && !node.isTextblock) {
            visit(node, pos + 1);
          }
          pos += node.nodeSize;
        }
      }

      walkListSiblings(
        siblings(),
        ({ node, pos }, index, isFirst, hasStart) => {
          decorations.push(
            Decoration.node(
              pos + 1,
              pos + 1 + node.firstChild!.nodeSize,
              { "data-index": String(index) },
              { index, isFirst, hasStart },
            ),
          );
        },
        (items) => {
          prefix ??= `bn-list-item-${UniqueID.options.generateID()}`;
          const ids = items.map(({ node, pos }) => {
            // Namespace each editor and escape whitespace in caller-supplied IDs.
            const id = `${prefix}-${
              typeof node.attrs.id === "string"
                ? `id-${encodeURIComponent(node.attrs.id)}`
                : `pos-${pos}`
            }`;
            // Include children inside their parent list item's semantics.
            accessibilityDecorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                id,
                role: "listitem",
              }),
            );
            return id;
          });
          accessibilityDecorations.push(
            Decoration.widget(
              items[0].pos,
              (view) => createListOwner(view.dom.ownerDocument, ids),
              { side: -1, key: ids.join(" "), ignoreSelection: true },
            ),
          );
        },
      );
    }

    visit(doc, 0);
    const indices = DecorationSet.create(doc, decorations);
    return {
      decorations: indices,
      readOnlyDecorations: indices.add(doc, accessibilityDecorations),
    };
  }

  return {
    key: "listItem",
    prosemirrorPlugins: [
      new Plugin<ListDecorations>({
        key: listItemPluginKey,
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (tr, previous) =>
            tr.docChanged ? decorate(tr.doc) : previous,
        },
        props: {
          // ReadOnlyExtension dispatches when editability changes. Keep
          // numbering when editing resumes, but remove owners and item roles.
          decorations(state) {
            const decorations = listItemPluginKey.getState(state);
            return editor.isEditable
              ? decorations?.decorations
              : decorations?.readOnlyDecorations;
          },
        },
      }),
    ],
  };
});
