import { updateBlockCommand } from "../../api/blockManipulation/updateBlock.js";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const handleEnter = (editor: BlockNoteEditor<any, any, any>) => {
  const ttEditor = editor._tiptapEditor;
  const { contentNode, contentType } = getBlockInfoFromPos(
    ttEditor.state.doc,
    ttEditor.state.selection.from
  )!;

  const selectionEmpty =
    ttEditor.state.selection.anchor === ttEditor.state.selection.head;

  if (
    !(
      contentType.name === "bulletListItem" ||
      contentType.name === "numberedListItem" ||
      contentType.name === "checkListItem"
    ) ||
    !selectionEmpty
  ) {
    return false;
  }

  return ttEditor.commands.first(({ state, chain, commands }) => [
    () =>
      // Changes list item block to a paragraph block if the content is empty.
      commands.command(() => {
        if (contentNode.childCount === 0) {
          return commands.command(
            updateBlockCommand(editor, state.selection.from, {
              type: "paragraph",
              props: {},
            })
          );
        }

        return false;
      }),

    () =>
      // Splits the current block, moving content inside that's after the cursor
      // to a new block of the same type below.
      commands.command(() => {
        if (contentNode.childCount > 0) {
          chain()
            .deleteSelection()
            .BNSplitBlock(state.selection.from, true)
            .run();

          return true;
        }

        return false;
      }),
  ]);
};
