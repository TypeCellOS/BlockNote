import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";

import { createExtension } from "../../editor/BlockNoteExtension.js";
import { getListItemA11yDecorations } from "./getListItemA11yDecorations.js";
import { getListItemIndexDecorations } from "./getListItemIndexDecorations.js";

type ListItemPluginState = {
  indexDecorations: DecorationSet;
  decorations: DecorationSet;
};

export const listItemPluginKey = new PluginKey<ListItemPluginState>("listItem");

/** Numbers list items and supplies list ownership in both editing modes. */
export const ListItemExtension = createExtension(({ editor }) => {
  function getDecorations(tr: Transaction, previousIndices: DecorationSet) {
    const indexDecorations = getListItemIndexDecorations(tr, previousIndices);
    const a11yDecorations = getListItemA11yDecorations(
      tr.doc,
      (type) => !!editor.schema.blockSpecs[type]?.implementation.meta.listItem,
    );
    return {
      indexDecorations,
      decorations: a11yDecorations.add(tr.doc, indexDecorations.find()),
    };
  }

  return {
    key: "listItem",
    prosemirrorPlugins: [
      new Plugin<ListItemPluginState>({
        key: listItemPluginKey,
        state: {
          init: (_, state) => getDecorations(state.tr, DecorationSet.empty),
          apply: (tr, previous) =>
            tr.docChanged
              ? getDecorations(tr, previous.indexDecorations)
              : previous,
        },
        props: {
          decorations: (state) =>
            listItemPluginKey.getState(state)?.decorations,
        },
      }),
    ],
  };
});
