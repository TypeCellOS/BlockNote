import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey(`ordered-list`);

export const OrderedListPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const newTr = newState.tr;
      let modified = false;
      let count = 1;
      let skip = 0;
      newState.doc.descendants((node, pos) => {
        if (node.type.name === "tcblock" && !node.attrs.listType) count = 1;
        if (
          skip === 0 &&
          node.type.name === "tcblock" &&
          node.attrs.listType === "oli"
        ) {
          skip = node.content.childCount;
          // This assumes that the content node is always the first child of the oli block,
          // as the content model grows this assumption may need to change
          if (node.content.child(0).attrs.position !== `${count}.`) {
            // TODO: @DAlperin currently sub-items just continue from the order of the parent,
            //  sub-items should be ordered separately with letters or roman numerals or some such
            newTr.setNodeMarkup(pos + 1, undefined, {
              ...node.attrs,
              position: `${count}.`,
            });
            modified = true;
          }

          count++;
        } else if (skip > 0) skip--;
      });
      if (modified) {
        return newTr;
      }
      return null;
    },
  });
};
