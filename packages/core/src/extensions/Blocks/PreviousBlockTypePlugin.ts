import {
  combineTransactionSteps,
  findChildren,
  getChangedRanges,
} from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`previous-blocks`);

const nodeAttributes: Record<string, string> = {
  // Numbered List Items
  index: "index",
  // Headings
  level: "level",
  // All Blocks
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
                index: newContentNode.attrs.index,
                level: newContentNode.attrs.level,
                type: newContentNode.type.name,
                depth: newState.doc.resolve(node.pos).depth,
              };

              const oldAttrs = {
                index: oldContentNode.attrs.index,
                level: oldContentNode.attrs.level,
                type: oldContentNode.type.name,
                depth: oldState.doc.resolve(oldNode.pos).depth,
              };

              // Hacky fix to avoid processing certain transactions created by the numbered list indexing plugin.

              // True when an existing numbered list item is assigned an index for the first time, which happens
              // immediately after it's created. Using this condition to start an animation ensures it's not
              // immediately overridden by a different transaction created by the numbered list indexing plugin.
              const indexInitialized =
                oldAttrs.index === null && newAttrs.index !== null;

              // True when an existing numbered list item changes nesting levels, before its index is updated by the
              // numbered list indexing plugin. This condition ensures that animations for indentation still work with
              // numbered list items, while preventing unnecessary animations being done when dragging/dropping them.
              const depthChanged =
                oldAttrs.index !== null &&
                newAttrs.index !== null &&
                oldAttrs.index === newAttrs.index;

              // Only false for transactions in which the block remains a numbered list item before & after, but neither
              // of the previous conditions apply.
              const shouldUpdate =
                oldAttrs.type === "numberedListItem" &&
                newAttrs.type === "numberedListItem"
                  ? indexInitialized || depthChanged
                  : true;

              if (
                JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs) && // TODO: faster deep equal?
                shouldUpdate
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
