import { Editor } from "@tiptap/core";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";

export const handleEnter = (editor: Editor) => {
  const { node, contentType } = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  )!;

  const selectionEmpty =
    editor.state.selection.anchor === editor.state.selection.head;

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

  return editor.commands.first(({ state, chain, commands }) => [
    () =>
      // Changes list item block to a paragraph block if the content is empty.
      commands.command(() => {
        if (node.firstChild!.nodeSize === 2) {
          return commands.BNUpdateBlock(state.selection.from, {
            type: "paragraph",
            props: {},
          });
        }

        return false;
      }),

    () =>
      // Splits the current block, moving content inside that's after the cursor
      // to a new block of the same type below.
      commands.command(() => {
        if (node.firstChild!.nodeSize > 2) {
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
