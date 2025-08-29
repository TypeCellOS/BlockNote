import { callOrReturn, Extension, getExtensionField } from "@tiptap/core";
import { columnResizing, goToNextCell, tableEditing } from "prosemirror-tables";

export const RESIZE_MIN_WIDTH = 35;
export const EMPTY_CELL_WIDTH = 120;
export const EMPTY_CELL_HEIGHT = 31;

export const TableExtension = Extension.create({
  name: "BlockNoteTableExtension",

  addProseMirrorPlugins: () => {
    return [
      columnResizing({
        cellMinWidth: RESIZE_MIN_WIDTH,
        defaultCellMinWidth: EMPTY_CELL_WIDTH,
        // We set this to null as we implement our own node view in the table
        // block content. This node view is the same as what's used by default,
        // but is wrapped in a `blockContent` HTML element.
        View: null,
      }),
      tableEditing(),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Makes enter create a new line within the cell.
      Enter: () => {
        if (
          this.editor.state.selection.empty &&
          this.editor.state.selection.$head.parent.type.name ===
            "tableParagraph"
        ) {
          this.editor.commands.insertContent({ type: "hardBreak" });

          return true;
        }

        return false;
      },
      // Ensures that backspace won't delete the table if the text cursor is at
      // the start of a cell and the selection is empty.
      Backspace: () => {
        const selection = this.editor.state.selection;
        const selectionIsEmpty = selection.empty;
        const selectionIsAtStartOfNode = selection.$head.parentOffset === 0;
        const selectionIsInTableParagraphNode =
          selection.$head.node().type.name === "tableParagraph";

        return (
          selectionIsEmpty &&
          selectionIsAtStartOfNode &&
          selectionIsInTableParagraphNode
        );
      },
      // Enables navigating cells using the tab key.
      Tab: () => {
        return this.editor.commands.command(({ state, dispatch, view }) =>
          goToNextCell(1)(state, dispatch, view),
        );
      },
      "Shift-Tab": () => {
        return this.editor.commands.command(({ state, dispatch, view }) =>
          goToNextCell(-1)(state, dispatch, view),
        );
      },
    };
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    };

    return {
      tableRole: callOrReturn(
        getExtensionField(extension, "tableRole", context),
      ),
    };
  },
});
