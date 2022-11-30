import {
  combineTransactionSteps,
  findChildren,
  getChangedRanges,
} from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`previous-blocks`);

const nodeAttributes: Record<string, string> = {
  listItemType: "list-item-type",
  listItemIndex: "list-item-index",
  headingLevel: "heading-level",
  type: "type",
  depth: "depth",
  "depth-change": "depth-change",
};

/**
 * This plugin tracks transformation of Block node attributes, so we can support CSS transitions.
 *
 * Problem it solves: ProseMirror recreates the DOM when transactions happen. So when a transaction changes a Node attribute,
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
            // use setTimeout 0 to clear the decorations so that at least
            // for one DOM-render the decorations have been applied
            setTimeout(() => {
              view.dispatch(
                view.state.tr.setMeta(PLUGIN_KEY, { clearUpdate: true })
              );
            }, 0);
          }
        },
      };
    },
    state: {
      init() {
        return {
          prevBlockAttrs: {} as any,
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
            const oldContentNode = oldNode?.node.firstChild;
            const newContentNode = node.node.firstChild;
            if (oldNode && oldContentNode && newContentNode) {
              const newAttrs = {
                listItemType: newContentNode.attrs.listItemType,
                listItemIndex: newContentNode.attrs.listItemIndex,
                headingLevel: newContentNode.attrs.headingLevel,
                type: newContentNode.type.name,
                depth: newState.doc.resolve(node.pos).depth,
              };

              const oldAttrs = {
                listItemType: oldContentNode.attrs.listItemType,
                listItemIndex: oldContentNode.attrs.listItemIndex,
                headingLevel: oldContentNode.attrs.headingLevel,
                type: oldContentNode.type.name,
                depth: oldState.doc.resolve(oldNode.pos).depth,
              };

              // Hacky fix to avoid processing certain transactions created by ordered list indexing plugin.
              // Ignores when an ordered list item is assigned an index for the first time.
              if (
                newAttrs.listItemType === "ordered" &&
                newAttrs.listItemIndex === null
              ) {
                return;
              }
              // Ignores when the indices of ordered list items are updated (i.e. dragging and dropping).
              if (
                oldAttrs.listItemType === "ordered" &&
                oldAttrs.listItemIndex !== null &&
                newAttrs.listItemType === "ordered" &&
                newAttrs.listItemIndex !== null
              ) {
                return;
              }

              if (
                JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs) // TODO: faster deep equal?
              ) {
                (oldAttrs as any)["depth-change"] =
                  oldAttrs.depth - newAttrs.depth;
                prev.prevBlockAttrs[node.node.attrs.id] = oldAttrs;

                // for debugging:
                console.log(
                  "id:",
                  node.node.attrs.id,
                  "previousBlockTypePlugin changes detected, oldAttrs",
                  oldAttrs,
                  "new",
                  newAttrs
                );

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
        const pluginState = (this as Plugin).getState(state);
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
          for (let [nodeAttr, val] of Object.entries(prevAttrs)) {
            decorationAttributes["data-prev-" + nodeAttributes[nodeAttr]] =
              val || "none";
          }

          // for debugging:
          console.log(
            "previousBlockTypePlugin committing decorations",
            decorationAttributes
          );

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
