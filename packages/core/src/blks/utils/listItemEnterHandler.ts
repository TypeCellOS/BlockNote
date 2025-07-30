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
