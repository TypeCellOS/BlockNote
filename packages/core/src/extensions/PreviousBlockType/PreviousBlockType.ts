import { findChildrenInRange } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createExtension } from "../../editor/BlockNoteExtension.js";

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
export const PreviousBlockTypeExtension = createExtension(() => {
  let timeout: ReturnType<typeof setTimeout>;
  return {
    key: "previousBlockType",
    prosemirrorPlugins: [
      new Plugin({
        key: PLUGIN_KEY,
        view(_editorView) {
          return {
            update: async (view, _prevState) => {
              if (this.key?.getState(view.state).updatedBlocks.size > 0) {
                // use setTimeout 0 to clear the decorations so that at least
                // for one DOM-render the decorations have been applied
                timeout = setTimeout(() => {
                  view.dispatch(
                    view.state.tr.setMeta(PLUGIN_KEY, { clearUpdate: true }),
                  );
                }, 0);
              }
            },
            destroy: () => {
              if (timeout) {
                clearTimeout(timeout);
              }
            },
          };
        },
        state: {
          init() {
            return {
              // Block attributes, by block ID, from just before the previous transaction.
              prevTransactionOldBlockAttrs: {} as any,
              // Block attributes, by block ID, from just before the current transaction.
              currentTransactionOldBlockAttrs: {} as any,
              // Set of IDs of blocks whose attributes changed from the current transaction.
              updatedBlocks: new Set<string>(),
            };
          },

          apply(transaction, prev, oldState, newState) {
            prev.currentTransactionOldBlockAttrs = {};
            prev.updatedBlocks.clear();

            if (!transaction.docChanged) {
              return prev;
            }

            // Only check nodes affected by the transaction, not the entire document.
            // changedRange() is O(steps) unlike tiptap's getChangedRanges which is O(steps²).
            const newRange = transaction.changedRange();
            if (!newRange) {
              return prev;
            }

            // Map the new-doc range back to old-doc coordinates
            const invertedMapping = transaction.mapping.invert();
            const oldRange = {
              from: invertedMapping.map(newRange.from, -1),
              to: invertedMapping.map(newRange.to, 1),
            };

            const currentTransactionOriginalOldBlockAttrs = {} as any;

            const oldNodes = findChildrenInRange(
              oldState.doc,
              oldRange,
              (node) => node.attrs.id,
            );
            const oldNodesById = new Map(
              oldNodes.map((node) => [node.node.attrs.id, node]),
            );
            const newNodes = findChildrenInRange(
              newState.doc,
              newRange,
              (node) => node.attrs.id,
            );

            for (const node of newNodes) {
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

                currentTransactionOriginalOldBlockAttrs[
                  node.node.attrs.id
                ] = oldAttrs;

                prev.currentTransactionOldBlockAttrs[node.node.attrs.id] =
                  oldAttrs;

                if (
                  oldAttrs.index !== newAttrs.index ||
                  oldAttrs.level !== newAttrs.level ||
                  oldAttrs.type !== newAttrs.type ||
                  oldAttrs.depth !== newAttrs.depth
                ) {
                  (oldAttrs as any)["depth-change"] =
                    oldAttrs.depth - newAttrs.depth;

                  prev.updatedBlocks.add(node.node.attrs.id);
                }
              }
            }

            prev.prevTransactionOldBlockAttrs =
              currentTransactionOriginalOldBlockAttrs;

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

              const prevAttrs =
                pluginState.currentTransactionOldBlockAttrs[node.attrs.id];
              const decorationAttrs: any = {};

              for (const [nodeAttr, val] of Object.entries(prevAttrs)) {
                decorationAttrs["data-prev-" + nodeAttributes[nodeAttr]] =
                  val || "none";
              }

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  ...decorationAttrs,
                }),
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ],
  } as const;
});
