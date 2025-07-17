import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  isTableCell,
  mapTableCell,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";
import { TableHandleMenuProps } from "../TableHandleMenuProps.js";
import { ReactNode, useMemo } from "react";

export const ColorPickerButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableHandleMenuProps<I, S> & {
    children?: ReactNode;
  },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();
  const tableHandles = editor.tableHandles;

  const currentCells = useMemo(() => {
    if (!tableHandles || !props.block) {
      return [];
    }

    if (props.orientation === "row") {
      return tableHandles.getCellsAtRowHandle(props.block, props.index);
    }

    return tableHandles.getCellsAtColumnHandle(props.block, props.index);
  }, [props.block, props.index, props.orientation, tableHandles]);

  const updateColor = (color: string, type: "text" | "background") => {
    const newTable = props.block.content.rows.map((row) => {
      return {
        ...row,
        cells: row.cells.map((cell) => mapTableCell(cell)),
      };
    });

    currentCells.forEach(({ row, col }) => {
      if (type === "text") {
        newTable[row].cells[col].props.textColor = color;
      } else {
        newTable[row].cells[col].props.backgroundColor = color;
      }
    });

    editor.updateBlock(props.block, {
      type: "table",
      content: {
        ...props.block.content,
        rows: newTable,
      },
    });

    // Have to reset text cursor position to the block as `updateBlock`
    // moves the existing selection out of the block.
    editor.setTextCursorPosition(props.block);
  };

  if (
    !currentCells ||
    !currentCells[0] ||
    !tableHandles ||
    (editor.settings.tables.cellTextColor === false &&
      editor.settings.tables.cellBackgroundColor === false)
  ) {
    return null;
  }

  const firstCell = mapTableCell(currentCells[0].cell);

  return (
    <Components.Generic.Menu.Root position={"right"} sub={true}>
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className={"bn-menu-item"}
          subTrigger={true}
        >
          {/* TODO should I be using the dictionary here? */}
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
                  // All cells have the same text color
                  color: currentCells.every(
                    ({ cell }) =>
                      isTableCell(cell) &&
                      cell.props.textColor === firstCell.props.textColor,
                  )
                    ? firstCell.props.textColor
                    : "default",
                  setColor: (color) => {
                    updateColor(color, "text");
                  },
                }
              : undefined
          }
          background={
            editor.settings.tables.cellBackgroundColor
              ? {
                  color: currentCells.every(
                    ({ cell }) =>
                      isTableCell(cell) &&
                      cell.props.backgroundColor ===
                        firstCell.props.backgroundColor,
                  )
                    ? firstCell.props.backgroundColor
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
