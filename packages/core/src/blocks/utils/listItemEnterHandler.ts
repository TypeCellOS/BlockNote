import { splitBlockTr } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const handleEnter = (
  editor: BlockNoteEditor<any, any, any>,
  listItemType: string,
) => {
  const { blockInfo, selectionEmpty } = editor.transact((tr) => {
    return {
      blockInfo: getBlockInfoFromTransaction(tr),
      selectionEmpty: tr.selection.anchor === tr.selection.head,
    };
  });

  if (!blockInfo.isBlockContainer) {
    return false;
  }
  const { bnBlock: blockContainer, blockContent } = blockInfo;

  if (!(blockContent.node.type.name === listItemType) || !selectionEmpty) {
    return false;
  }

  // Check if the toggle block has child blocks (e.g., folded toggle with children).
  // The blockContainer's last child is either a blockGroup (has children) or nothing.
  const hasChildBlocks = blockContainer.node.lastChild?.type.name === "blockGroup"
    && blockContainer.node.lastChild!.childCount > 0;
  if (hasChildBlocks) {
    // Don't split the toggle when it has children - just create a new paragraph
    return editor.transact((tr) => {
      tr.deleteSelection();
      const pos = tr.selection.from;
      const paraType = tr.doc.schema.nodes["paragraph"];
      tr.split(pos, 2, [{type: tr.doc.schema.nodes["blockContainer"], attrs: {}}, {type: paraType}]);
      return true;
    });
  }

  if (blockContent.node.childCount === 0) {
    editor.transact((tr) => {
      updateBlockTr(tr, blockContainer.beforePos, {
        type: "paragraph",
        props: {},
      });
    });
    return true;
  } else if (blockContent.node.childCount > 0) {
    return editor.transact((tr) => {
      tr.deleteSelection();
      return splitBlockTr(tr, tr.selection.from, true);
    });
  }

  return false;
};
