import { isTableCell, mapTableCell } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";

export const ColorPickerButton = (props: { children?: ReactNode }) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<any, any, any>();

  const { block, colIndex, rowIndex } = useExtensionState(
    TableHandlesExtension,
    {
      selector: (state) => ({
        block: state?.block,
        colIndex: state?.colIndex,
        rowIndex: state?.rowIndex,
      }),
    },
  );

  const updateColor = (color: string, type: "text" | "background") => {
    if (
      block === undefined ||
      colIndex === undefined ||
      rowIndex === undefined
    ) {
      return;
    }

    const newTable = block.content.rows.map((row) => {
      return {
        ...row,
        cells: row.cells.map((cell) => mapTableCell(cell)),
      };
    });

    if (type === "text") {
      newTable[rowIndex].cells[colIndex].props.textColor = color;
    } else {
      newTable[rowIndex].cells[colIndex].props.backgroundColor = color;
    }

    editor.updateBlock(block, {
      type: "table",
      content: {
        ...block.content,
        rows: newTable,
      },
    });

    // Have to reset text cursor position to the block as `updateBlock`
    // moves the existing selection out of the block.
    editor.setTextCursorPosition(block);
  };

  if (block === undefined || colIndex === undefined || rowIndex === undefined) {
    return null;
  }

  const currentCell = block.content.rows[rowIndex]?.cells?.[colIndex];

  if (
    !currentCell ||
    (editor.settings.tables.cellTextColor === false &&
      editor.settings.tables.cellBackgroundColor === false)
  ) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root position={"right"} sub={true}>
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className={"bn-menu-item"}
          subTrigger={true}
        >
          {props.children || dict.drag_handle.colors_menuitem}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>

      <Components.Generic.Menu.Dropdown
        sub={true}
        className={"bn-menu-dropdown bn-color-picker-dropdown"}
      >
        <ColorPicker
          iconSize={18}
          text={
            editor.settings.tables.cellTextColor
              ? {
                  color: isTableCell(currentCell)
                    ? currentCell.props.textColor
                    : "default",
                  setColor: (color) => updateColor(color, "text"),
                }
              : undefined
          }
          background={
            editor.settings.tables.cellBackgroundColor
              ? {
                  color: isTableCell(currentCell)
                    ? currentCell.props.backgroundColor
                    : "default",
                  setColor: (color) => updateColor(color, "background"),
                }
              : undefined
          }
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
