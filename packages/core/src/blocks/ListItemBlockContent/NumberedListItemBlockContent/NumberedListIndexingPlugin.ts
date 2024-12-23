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
          let newIndex = `${node.firstChild!.attrs["start"] || 1}`;

          const blockInfo = getBlockInfo({
            posBeforeNode: pos,
            node,
          });

          if (!blockInfo.isBlockContainer) {
            throw new Error("impossible");
          }

          // Checks if this block is the start of a new ordered list, i.e. if it's the first block in the document, the
          // first block in its nesting level, or the previous block is not an ordered list item.

          const prevBlock = tr.doc.resolve(
            blockInfo.bnBlock.beforePos
          ).nodeBefore;

          if (prevBlock) {
            const prevBlockInfo = getBlockInfo({
              posBeforeNode: blockInfo.bnBlock.beforePos - prevBlock.nodeSize,
              node: prevBlock,
            });

            const isPrevBlockOrderedListItem =
              prevBlockInfo.blockNoteType === "numberedListItem";

            if (isPrevBlockOrderedListItem) {
              if (!prevBlockInfo.isBlockContainer) {
                throw new Error("impossible");
              }
              const prevBlockIndex =
                prevBlockInfo.blockContent.node.attrs["index"];

              newIndex = (parseInt(prevBlockIndex) + 1).toString();
            }
          }

          const contentNode = blockInfo.blockContent.node;
          const index = contentNode.attrs["index"];
          const isFirst =
            prevBlock?.firstChild?.type.name !== "numberedListItem";

          if (index !== newIndex || (contentNode.attrs.start && !isFirst)) {
            modified = true;

            const { start, ...attrs } = contentNode.attrs;

            tr.setNodeMarkup(blockInfo.blockContent.beforePos, undefined, {
              ...attrs,
              index: newIndex,
              ...(typeof start === "number" &&
                isFirst && {
                  start,
                }),
            });
          }
        }
      });

      return modified ? tr : null;
    },
  });
};
