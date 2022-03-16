import {
  combineTransactionSteps,
  findChildren,
  getChangedRanges,
} from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`previous-blocks`);

/**
 * This plugin tracks transformation of Block node attributes, so we can support CSS transitions.
 *
 * Problem it solves: Prosemirror recreates the DOM when transactions happen. So when a transaction changes an Node attribute,
 * it results in a completely new DOM element. This means CSS transitions don't work.
 *
 * Solution: When attributes change on a node, this plugin sets a data-* attribute with the "previous" value. This way we can still use CSS transitions. (See block.module.css)
 */
export const PreviousBlockTypePlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    view(_editorView) {
      return {
        update: async (view, _prevState) => {
          if (this.key?.getState(view.state).needsUpdate) {
            // use setImmediate to clear the decorations so that at least
            // for one DOM-render the decorations have been applied
            setImmediate(() => {
              view.dispatch(
                view.state.tr.setMeta(PLUGIN_KEY, { clearUpdate: true })
              );
            });
          }
        },
      };
    },
    state: {
      init() {
        return {
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

        // TODO: instead of iterating through the entire document, only check nodes affected by the transactions
        // We didn't get this to work yet:
        // changes.forEach(({ oldRange, newRange }) => {
        // const oldNodes = findChildrenInRange(
        //   oldState.doc,
        //   oldRange,
        //   (node) => node.attrs.id
        // );

        // const newNodes = findChildrenInRange(
        //   newState.doc,
        //   newRange,
        //   (node) => node.attrs.id
        // );

        changes.forEach(() => {
          const oldNodes = findChildren(oldState.doc, (node) => node.attrs.id);

          const oldNodesById = new Map(
            oldNodes.map((node) => [node.node.attrs.id, node])
          );

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
