import { splitBlockTr } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const handleEnter = (
  editor: BlockNoteEditor<any, any, any>,
  listItemType: string,
) => {
  const { blockInfo, selectionEmpty } = editor.transact((tr) => {
    return {
      blockInfo: getBlockInfoFromSelection(tr),
      selectionEmpty: tr.selection.anchor === tr.selection.head,
    };
  });

  if (!blockInfo.hasContent) {
    return false;
  }
  const { block: blockContainer, content } = blockInfo;

  if (!(content.node.type.name === listItemType) || !selectionEmpty) {
    return false;
  }

  if (blockInfo.isContentEmpty) {
    editor.transact((tr) => {
      updateBlockTr(tr, blockContainer.beforePos, {
        type: "paragraph",
        props: {},
      });
    });
    return true;
  } else if (content.node.childCount > 0) {
    return editor.transact((tr) => {
      tr.deleteSelection();
      tr.scrollIntoView();
      return splitBlockTr(tr, tr.selection.from, true);
    });
  }

  return false;
};
