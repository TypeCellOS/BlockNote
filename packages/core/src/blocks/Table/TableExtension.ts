import { callOrReturn, Extension, getExtensionField } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import {
  columnResizing,
  fixTablesKey,
  goToNextCell,
  isInTable,
  moveCellForward,
  nextCell,
  selectionCell,
  tableEditing,
} from "prosemirror-tables";

export const RESIZE_MIN_WIDTH = 35;
export const EMPTY_CELL_WIDTH = 120;
export const EMPTY_CELL_HEIGHT = 31;

export const TableExtension = Extension.create({
  name: "BlockNoteTableExtension",

  addProseMirrorPlugins() {
    const editor = this.editor;
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
      new Plugin({
        key: new PluginKey("blocknote-fix-tables-gate"),
        // `tableEditing()` appends a normalizing `fixTables` transaction
        // whenever it sees an "inconsistent" table. A rendered diff shows
        // inconsistent tables *on purpose* (deleted row/column copies next to
        // their replacements), and the editor is read-only while it does — so
        // letting the fix run would silently rewrite the very diff being
        // displayed. A read-only editor shouldn't self-normalize at all:
        // block `fixTables` transactions while the editor isn't editable.
        filterTransaction: (tr) =>
          !(tr.getMeta(fixTablesKey) && !editor.isEditable),
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Moves the selection to the cell below.
      Enter: () => {
        if (!isInTable(this.editor.state)) {
          return false;
        }

        return this.editor.commands.command(({ state, dispatch }) => {
          const $cell = selectionCell(state);
          const $nextCell = $cell ? nextCell($cell, "vert", 1) : null;

          if ($nextCell && dispatch) {
            dispatch(
              state.tr
                .setSelection(
                  TextSelection.between($nextCell, moveCellForward($nextCell)),
                )
                .scrollIntoView(),
            );
          }

          return true;
        });
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
        return this.editor.commands.command(({ state, dispatch, view }) => {
          if (!isInTable(state)) {
            return false;
          }

          goToNextCell(1)(state, dispatch, view);

          // Always return true to avoid accidental indents.
          return true;
        });
      },
      "Shift-Tab": () => {
        return this.editor.commands.command(({ state, dispatch, view }) => {
          if (!isInTable(state)) {
            return false;
          }

          // Always return true to avoid accidental un-indents.
          goToNextCell(-1)(state, dispatch, view);

          return true;
        });
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
