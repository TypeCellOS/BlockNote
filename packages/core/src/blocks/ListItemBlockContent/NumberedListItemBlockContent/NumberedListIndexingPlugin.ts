import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockInfoFromPos_DEPRECATED } from "../../../api/getBlockInfoFromPos.js";

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
          const isFirstBlockInDoc = pos === 1;

          const blockInfo = getBlockInfoFromPos_DEPRECATED(tr.doc, pos)!;

          // Checks if this block is the start of a new ordered list, i.e. if it's the first block in the document, the
          // first block in its nesting level, or the previous block is not an ordered list item.
          if (!isFirstBlockInDoc) {
            const prevBlock = tr.doc.resolve(
              blockInfo.blockContainer.beforePos - 1
            ).nodeBefore!;
            const prevBlockInfo = getBlockInfoFromPos_DEPRECATED(
              tr.doc,
              blockInfo.blockContainer.beforePos - prevBlock.nodeSize
            )!;
            if (prevBlockInfo === undefined) {
              return;
            }

            const isFirstBlockInNestingLevel =
              blockInfo.depth !== prevBlockInfo.depth;

            if (!isFirstBlockInNestingLevel) {
              const prevBlockContentNode = prevBlockInfo.blockContent.node;
              const prevBlockContentType = prevBlockContentNode.type;

              const isPrevBlockOrderedListItem =
                prevBlockContentType.name === "numberedListItem";

              if (isPrevBlockOrderedListItem) {
                const prevBlockIndex = prevBlockContentNode.attrs["index"];

                newIndex = (parseInt(prevBlockIndex) + 1).toString();
              }
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
