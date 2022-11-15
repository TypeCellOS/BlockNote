import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey(`ordered-list`);

export const OrderedListPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const newTr = newState.tr;
      let modified = false;
      let skip = 0;

      let countPerBlockGroup = new Map();

      newState.doc.descendants((node, pos, parent) => {
        if (node.type.name === "block" && !node.attrs.listType) {
          // reset for non consecutive oli blocks
          countPerBlockGroup.set(parent, 1);
        }
        if (
          skip === 0 &&
          node.type.name === "block" &&
          node.attrs.listType === "oli"
        ) {
          skip = node.content.childCount;

          // create count for block group if not exist
          if (!countPerBlockGroup.has(parent)) {
            countPerBlockGroup.set(parent, 1);
          }

          let count = countPerBlockGroup.get(parent);

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

          countPerBlockGroup.set(parent, count + 1);
        } else if (skip > 0) {
          skip--;
        }
      });
      if (modified) {
        return newTr;
      }
      return null;
    },
  });
};
