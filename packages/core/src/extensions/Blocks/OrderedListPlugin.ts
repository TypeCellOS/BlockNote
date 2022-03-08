import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey(`ordered-list`);

function getLetterForNumber(number: number): string {
  let s = "",
    t;

  while (number > 0) {
    t = (number - 1) % 26;
    s = String.fromCharCode(65 + t) + s;
    number = ((number - t) / 26) | 0;
  }
  return s;
}

export const OrderedListPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const newTr = newState.tr;
      let modified = false;

      let countByDepth = new Map<number, number>();
      let prevDepth = 1;
      newState.doc.descendants((node, pos) => {
        const depth = newState.doc.resolve(pos).depth;
        if (node.type.name !== "tcblock") {
          return;
        }
        if (node.attrs.listType !== "oli") {
          countByDepth.set(depth, 0);
        } else {
          if (prevDepth < depth) countByDepth.set(depth, 0);
          let currentCount = (countByDepth.get(depth) || 0) + 1;
          countByDepth.set(depth, currentCount);
          // This assumes that the content node is always the first child of the oli block,
          // as the content model grows this assumption may need to change
          if (
            node.content.child(0).attrs.position !== `${currentCount}.` ||
            prevDepth !== depth
          ) {
            let display: string | number = 0;
            if (depth === 1 || Math.ceil(depth / 3) % 2 === 0)
              display = currentCount;
            else if (depth > 1) display = getLetterForNumber(currentCount);
            newTr.setNodeMarkup(pos + 1, undefined, {
              ...node.attrs,
              position: `${display}.`,
            });
            modified = true;
          }
          prevDepth = depth;
        }
      });
      if (modified) {
        return newTr;
      }
      return null;
    },
  });
};
