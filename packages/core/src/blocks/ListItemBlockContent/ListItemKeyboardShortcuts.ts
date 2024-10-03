import { Editor } from "@tiptap/core";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";

export const handleEnter = (editor: Editor) => {
  const info = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  )!;

  const selectionEmpty =
    editor.state.selection.anchor === editor.state.selection.head;

  if (
    !(
      info.type.name === "bulletListItem" ||
      info.type.name === "numberedListItem" ||
      info.type.name === "checkListItem"
    ) ||
    !selectionEmpty
  ) {
    return false;
  }

  if (!info.hasContent) {
    throw new Error("hasContent expected for list items");
  }

  return editor.commands.first(({ state, chain, commands }) => [
    () =>
      // Changes list item block to a paragraph block if the content is empty.
      commands.command(() => {
        if (info.contentNode.childCount === 0) {
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
        if (info.contentNode.childCount > 0) {
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
