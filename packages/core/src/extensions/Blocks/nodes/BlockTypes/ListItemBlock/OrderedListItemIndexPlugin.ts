import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockInfoFromPos } from "../../../helpers/getBlockInfoFromPos";

// ProseMirror Plugin which automatically assigns indices to ordered list items per nesting level.
const PLUGIN_KEY = new PluginKey(`ordered-list-item-index`);
export const OrderedListItemIndexPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const tr = newState.tr;
      tr.setMeta("orderedListIndexing", true);

      let modified = false;

      // Traverses each node the doc using DFS, so blocks which are on the same nesting level will be traversed in the
      // same order they appear. This means the index of each list item block can be calculated by incrementing the
      // index of the previous list item block.
      newState.doc.descendants((node, pos) => {
        if (
          node.type.name === "block" &&
          node.firstChild!.type.name === "listItemContent" &&
          node.firstChild!.attrs["listItemType"] === "ordered"
        ) {
          let isFirstListItem = true;

          const isFirstBlockInDoc = pos === 1;

          if (!isFirstBlockInDoc) {
            const blockInfo = getBlockInfoFromPos(tr.doc, pos + 1)!;
            if (blockInfo === undefined) {
              return;
            }

            const prevBlockInfo = getBlockInfoFromPos(tr.doc, pos - 2)!;
            if (prevBlockInfo === undefined) {
              return;
            }

            const isFirstBlockInNestingLevel =
              blockInfo.depth !== prevBlockInfo.depth;

            if (!isFirstBlockInNestingLevel) {
              const prevBlockContentNode = prevBlockInfo.contentNode;
              const prevBlockContentType = prevBlockInfo.contentType;

              const isPrevBlockOrderedListItem =
                prevBlockContentType.name === "listItemContent" &&
                prevBlockContentNode.attrs["listItemType"] === "ordered";

              if (isPrevBlockOrderedListItem) {
                isFirstListItem = false;
              }
            }
          }

          const index = node.attrs["listItemIndex"];
          let newIndex = "1";

          if (!isFirstListItem) {
            const prevBlockInfo = getBlockInfoFromPos(tr.doc, pos - 2);
            if (prevBlockInfo === undefined) {
              return;
            }

            const prevBlockContentNode = prevBlockInfo.contentNode;

            const prevBlockIndex = parseInt(
              prevBlockContentNode.attrs["listItemIndex"]
            );
            newIndex = (prevBlockIndex + 1).toString();
          }

          if (!index || index !== newIndex) {
            modified = true;

            tr.setNodeMarkup(pos + 1, undefined, {
              listItemType: "ordered",
              listItemIndex: newIndex,
            });
          }
        }
      });

      return modified ? tr : null;
    },
  });
};
