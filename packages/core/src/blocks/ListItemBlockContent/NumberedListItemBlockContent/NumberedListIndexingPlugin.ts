import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockInfo } from "../../../api/getBlockInfoFromPos.js";

// ProseMirror Plugin which automatically assigns indices to ordered list items per nesting level.
const PLUGIN_KEY = new PluginKey(`numbered-list-indexing`);
export const NumberedListIndexingPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const tr = newState.tr;
      tr.setMeta("numberedListIndexing", true);

      let modified = false;

      // Traverses each node the doc using DFS, so blocks which are on the same nesting level will be traversed in the
      // same order they appear. This means the index of each list item block can be calculated by incrementing the
      // index of the previous list item block.
      newState.doc.descendants((node, pos) => {
        if (
          node.type.name === "blockContainer" &&
          node.firstChild!.type.name === "numberedListItem"
        ) {
          let newIndex = "1";

          const blockInfo = getBlockInfo({
            posBeforeNode: pos,
            node,
          });

          // Checks if this block is the start of a new ordered list, i.e. if it's the first block in the document, the
          // first block in its nesting level, or the previous block is not an ordered list item.

          const prevBlock = tr.doc.resolve(
            blockInfo.blockContainer.beforePos
          ).nodeBefore;

          if (prevBlock) {
            const prevBlockInfo = getBlockInfo({
              posBeforeNode:
                blockInfo.blockContainer.beforePos - prevBlock.nodeSize,
              node: prevBlock,
            });

            const isPrevBlockOrderedListItem =
              prevBlockInfo.blockContent.node.type.name === "numberedListItem";

            if (isPrevBlockOrderedListItem) {
              const prevBlockIndex =
                prevBlockInfo.blockContent.node.attrs["index"];

              newIndex = (parseInt(prevBlockIndex) + 1).toString();
            }
          }

          const contentNode = blockInfo.blockContent.node;
          const index = contentNode.attrs["index"];

          if (index !== newIndex) {
            modified = true;

            tr.setNodeMarkup(blockInfo.blockContent.beforePos, undefined, {
              index: newIndex,
            });
          }
        }
      });

      return modified ? tr : null;
    },
  });
};
