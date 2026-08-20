import { splitBlockTr } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { handleCollapsibleEnter } from "../../extensions/Collapsible/collapsibleEnter.js";

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

  if (!blockInfo.isBlockContainer) {
    return false;
  }
  const { bnBlock: blockContainer, blockContent } = blockInfo;

  if (!(blockContent.node.type.name === listItemType) || !selectionEmpty) {
    return false;
  }

  // Has to happen here rather than in the editor-wide Enter handling, which
  // this handler runs ahead of.
  if (editor.transact((tr) => handleCollapsibleEnter(editor, tr))) {
    return true;
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
      tr.scrollIntoView();
      return splitBlockTr(tr, tr.selection.from, true);
    });
  }

  return false;
};
