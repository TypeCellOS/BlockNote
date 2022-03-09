import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`ordered-list`);

function getLetterForNumber(number: number): string {
  let s = "",
    t;

  while (number > 0) {
    t = (number - 1) % 26;
    s = String.fromCharCode(97 + t) + s;
    number = ((number - t) / 26) | 0;
  }
  return s;
}

export const OrderedListPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      decorations: ({ doc }) => {
        const decs: Decoration[] = [];

        let countByDepth: number[] = [];
        let prevDepth = 1;
        doc.descendants((node, pos) => {
          const depth = doc.resolve(pos).depth;
          if (node.type.name !== "tcblock") {
            return;
          }
          if (node.attrs.listType !== "oli") {
            countByDepth.splice(depth, countByDepth.length);
          } else {
            if (prevDepth < depth) {
              countByDepth.splice(depth, countByDepth.length);
            }
            let currentCount = (countByDepth[depth] || 0) + 1;
            countByDepth[depth] = currentCount;
            // This assumes that the content node is always the first child of the oli block,
            // as the content model grows this assumption may need to change
            if (
              node.content.child(0).attrs.position !== `${currentCount}.` ||
              prevDepth !== depth
            ) {
              let display: string | number = 0;
              if (depth === 0 || Math.ceil(depth / 2) % 2 === 1) {
                display = currentCount;
              } else if (depth > 1) {
                display = getLetterForNumber(currentCount);
              }

              const contentNode = doc.resolve(pos + 2);

              const dec = Decoration.node(
                pos + 1,
                pos + 1 + contentNode.parent.nodeSize,
                {
                  "data-list-position": `${display}.`,
                }
              );
              decs.push(dec);
            }
            prevDepth = depth;
          }
        });
        const dset = decs.length ? DecorationSet.create(doc, decs) : null;
        return dset;
      },
    },
  });
};
