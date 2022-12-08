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
          if (this.key?.getState(view.state).updatedBlocks.size > 0) {
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
          updatedBlocks: new Set<string>(),
        };
      },

      apply(transaction, prev, oldState, newState) {
        prev.updatedBlocks.clear();

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
              let newAttrs = {
                listItemType: newContentNode.attrs.listItemType,
                listItemIndex: newContentNode.attrs.listItemIndex,
                headingLevel: newContentNode.attrs.headingLevel,
                type: newContentNode.type.name,
                depth: newState.doc.resolve(node.pos).depth,
              };

              let oldAttrs = {
                listItemType: oldContentNode.attrs.listItemType,
                listItemIndex: oldContentNode.attrs.listItemIndex,
                headingLevel: oldContentNode.attrs.headingLevel,
                type: oldContentNode.type.name,
                depth: oldState.doc.resolve(oldNode.pos).depth,
              };

              let ou = false;

              // Handles all transactions which modify ordered list items.
              if (
                oldAttrs.listItemType === "ordered" &&
                newAttrs.listItemType === "ordered"
              ) {
                const depthChanged =
                  oldAttrs.listItemIndex !== null &&
                  newAttrs.listItemIndex !== null &&
                  oldAttrs.depth !== newAttrs.depth;
                const indexInitialized =
                  oldAttrs.listItemIndex === null &&
                  newAttrs.listItemIndex !== null;
                const indexUpdated =
                  oldAttrs.listItemIndex !== newAttrs.listItemIndex &&
                  oldAttrs.listItemIndex !== null &&
                  newAttrs.listItemIndex !== null;

                // Checks if the transaction has moved the block to a different nesting level. Keep in mind if this also
                // changes the enclosed list item's index (it usually does), the OrderedListItemIndexPlugin will
                // immediately dispatch a transaction to update the index, which immediately overrides the changes made
                // by this one. Therefore, this is only relevant for the case in which the nesting level changes but the
                // index doesn't.
                if (depthChanged) {
                  ou = true;
                }

                // Checks if the transaction has either set the ordered list item's index for the first time or updated
                // it. These transactions are always generated by the OrderedListItemIndexPlugin.
                if (indexInitialized || indexUpdated) {
                  // Checks if the block containing the ordered list item already exists. Since this transaction was
                  // generated by the OrderedListItemIndexPlugin, the only attribute which has changed between oldAttrs
                  // and newAttrs is listItemIndex. However, if the block already exists and the index needs updating,
                  // it must mean that the block content type was just changed, or the block has just changed positions
                  // (including nesting levels). In either case, it means we need to get the remaining attributes from
                  // before the previous transaction.
                  if (prev.prevBlockAttrs[node.node.attrs.id]) {
                    oldAttrs = prev.prevBlockAttrs[node.node.attrs.id];
                    ou = true;
                  }

                  // Animating the index changing isn't necessary since we only care about the "slide out" animation, so
                  // this line disables that.
                  oldAttrs.listItemIndex = newAttrs.listItemIndex;
                }
              }

              prev.prevBlockAttrs[node.node.attrs.id] = oldAttrs;

              if (
                (newAttrs.listItemType === "ordered" ? ou : true) &&
                JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs) // TODO: faster deep equal?
              ) {
                (oldAttrs as any)["depth-change"] =
                  oldAttrs.depth - newAttrs.depth;

                // for debugging:
                // console.log(
                //   "id:",
                //   node.node.attrs.id,
                //   "previousBlockTypePlugin changes detected, oldAttrs",
                //   oldAttrs,
                //   "new",
                //   newAttrs
                // );

                prev.updatedBlocks.add(node.node.attrs.id);
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
        if (pluginState.updatedBlocks.size === 0) {
          return undefined;
        }

        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
          if (!node.attrs.id) {
            return;
          }

          if (!pluginState.updatedBlocks.has(node.attrs.id)) {
            return;
          }

          const prevAttrs = pluginState.prevBlockAttrs[node.attrs.id];
          const decorationAttrs: any = {};

          for (let [nodeAttr, val] of Object.entries(prevAttrs)) {
            decorationAttrs["data-prev-" + nodeAttributes[nodeAttr]] =
              val || "none";
          }

          // for debugging:
          // console.log(
          //   "previousBlockTypePlugin committing decorations",
          //   decorationAttrs
          // );

          const decoration = Decoration.node(pos, pos + node.nodeSize, {
            ...decorationAttrs,
          });

          decorations.push(decoration);
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
};
