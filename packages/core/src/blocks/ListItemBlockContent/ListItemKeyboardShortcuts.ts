import { splitBlockCommand } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const handleEnter = (editor: BlockNoteEditor<any, any, any>) => {
  const ttEditor = editor._tiptapEditor;
  const { blockContent } = getBlockInfoFromPos(
    ttEditor.state.doc,
    ttEditor.state.selection.from
  )!;

  const selectionEmpty =
    ttEditor.state.selection.anchor === ttEditor.state.selection.head;

  if (
    !(
      blockContent.node.type.name === "bulletListItem" ||
      blockContent.node.type.name === "numberedListItem" ||
      blockContent.node.type.name === "checkListItem"
    ) ||
    !selectionEmpty
  ) {
    return false;
  }

  return ttEditor.commands.first(({ state, chain, commands }) => [
    () =>
      // Changes list item block to a paragraph block if the content is empty.
      commands.command(() => {
        if (blockContent.node.childCount === 0) {
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
        if (blockContent.node.childCount > 0) {
          chain()
            .deleteSelection()
            .command(splitBlockCommand(state.selection.from, true))
            .run();

          return true;
        }

        return false;
      }),
  ]);
};
