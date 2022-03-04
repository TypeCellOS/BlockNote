import {
  combineTransactionSteps,
  findChildren,
  getChangedRanges,
} from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`previous-blocks`);

// const attrsToTrack = ["listType", "blockColor", "blockStyle"];
// TODO: document

export const PreviousBlockTypePlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    view(_editorView) {
      return {
        update: async (view, _prevState) => {
          //   console.log(
          //     "update view",
          //     this.key?.getState(view.state).needsUpdate
          //   );
          if (this.key?.getState(view.state).needsUpdate) {
            // setTimeout(() => {
            view.dispatch(
              view.state.tr.setMeta(PLUGIN_KEY, { clearUpdate: true })
            );
            // }, 10000);
          }
        },
      };
    },
    state: {
      init() {
        return {
          blockAttrs: {},
          prevBlockAttrs: {},
          needsUpdate: false,
        };
      },

      apply(transaction, prev, oldState, newState) {
        prev.needsUpdate = false;
        prev.prevBlockAttrs = {};
        if (!transaction.docChanged || oldState.doc.eq(newState.doc)) {
          return prev;
        }

        const transform = combineTransactionSteps(oldState.doc, [transaction]);
        // const { mapping } = transform;
        const changes = getChangedRanges(transform);

        changes.forEach(({ oldRange, newRange }) => {
          // const oldNodes = findChildrenInRange(
          //   oldState.doc,
          //   oldRange,
          //   (node) => node.attrs.id
          // );

          const oldNodes = findChildren(oldState.doc, (node) => node.attrs.id);

          const oldNodesById = new Map(
            oldNodes.map((node) => [node.node.attrs.id, node])
          );

          // const newNodes = findChildrenInRange(
          //   newState.doc,
          //   newRange,
          //   (node) => node.attrs.id
          // );

          const newNodes = findChildren(newState.doc, (node) => node.attrs.id);

          for (let node of newNodes) {
            const oldNode = oldNodesById.get(node.node.attrs.id);
            if (oldNode) {
              const newAttrs = {
                listType: node.node.attrs.listType,
                blockColor: node.node.attrs.blockColor,
                blockStyle: node.node.attrs.blockStyle,
                headingType: node.node.attrs.headingType,
                depth: newState.doc.resolve(node.pos).depth,
              };

              const oldAttrs = {
                listType: oldNode.node.attrs.listType,
                blockColor: oldNode.node.attrs.blockColor,
                blockStyle: oldNode.node.attrs.blockStyle,
                headingType: oldNode.node.attrs.headingType,
                depth: oldState.doc.resolve(oldNode.pos).depth,
              };

              if (
                JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs) // TODO: faster deep equal?
              ) {
                (oldAttrs as any).depthChange = oldAttrs.depth - newAttrs.depth;
                prev.prevBlockAttrs[node.node.attrs.id] = oldAttrs;
                prev.needsUpdate = true;
              }
            }
            // const newAttrs = {
            //   listType: node.node.attrs.listType,
            //   blockColor: node.node.attrs.blockColor,
            //   blockStyle: node.node.attrs.blockStyle,
            // };
            // if (!prev.blockAttrs[node.attrs.id]) {
            //   prev.blockAttrs[node.attrs.id] = newAttrs;
            // } else if (
            //   JSON.stringify(prev.blockAttrs[node.attrs.id]) !==
            //   JSON.stringify(newAttrs) // TODO: faster deep equal?
            // ) {
            //   debugger;
            //   prev.prevBlockAttrs[node.attrs.id] =
            //     prev.blockAttrs[node.attrs.id];
            //   prev.blockAttrs[node.attrs.id] = newAttrs;
            //   prev.needsUpdate = true;
            // }
          }
        });

        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = this.getState(state);
        if (!pluginState.needsUpdate) {
          return undefined;
        }

        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
          if (!node.attrs.id) {
            return;
          }
          const prevAttrs = pluginState.prevBlockAttrs[node.attrs.id];
          if (!prevAttrs) {
            return;
          }

          const decorationAttributes: any = {};
          for (let [key, val] of Object.entries(prevAttrs)) {
            decorationAttributes["data-prev-" + key] = val || "none";
          }
          const decoration = Decoration.node(pos, pos + node.nodeSize, {
            ...decorationAttributes,
          });

          decorations.push(decoration);
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
};
