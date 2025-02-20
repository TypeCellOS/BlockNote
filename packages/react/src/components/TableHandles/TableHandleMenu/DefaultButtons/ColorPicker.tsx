import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  isPartialTableCell,
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
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & {
    children?: ReactNode;
  }
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
    if (!tableHandles) {
      return [];
    }

    if (props.orientation === "row") {
      return tableHandles.getCellsAtRowHandle(props.block, props.index);
    }

    return tableHandles.getCellsAtColumnHandle(props.block, props.index);
  }, [props.block, props.index, props.orientation, tableHandles]);

  if (!currentCells || !tableHandles) {
    return null;
  }

  const firstCell = mapTableCell(currentCells[0].cell);

  return (
    <Components.Generic.Menu.Root position={"right"} sub={true}>
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className={"bn-menu-item"}
          subTrigger={true}>
          {/* TODO should I be using the dictionary here? */}
          {props.children || dict.drag_handle.colors_menuitem}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>

      <Components.Generic.Menu.Dropdown
        sub={true}
        className={"bn-menu-dropdown bn-color-picker-dropdown"}>
        <ColorPicker
          iconSize={18}
          text={{
            // All cells have the same text color
            color: currentCells.every(
              ({ cell }) =>
                isPartialTableCell(cell) &&
                cell.props.textColor === firstCell.props.textColor
            )
              ? firstCell.props.textColor
              : "default",
            setColor: (color) => {
              const newTable = props.block.content.rows.map((row) => {
                return {
                  ...row,
                  cells: row.cells.map((cell) => mapTableCell(cell)),
                };
              });

              currentCells.forEach(({ row, col }) => {
                newTable[row].cells[col].props.textColor = color;
              });

              return editor.updateBlock(props.block, {
                type: "table",
                content: {
                  ...props.block.content,
                  rows: newTable,
                },
              });
            },
          }}
          background={{
            color: currentCells.every(
              ({ cell }) =>
                isPartialTableCell(cell) &&
                cell.props.backgroundColor === firstCell.props.backgroundColor
            )
              ? firstCell.props.backgroundColor
              : "default",
            setColor: (color) => {
              const newTable = props.block.content.rows.map((row) => {
                return {
                  ...row,
                  cells: row.cells.map((cell) => mapTableCell(cell)),
                };
              });

              currentCells.forEach(({ row, col }) => {
                newTable[row].cells[col].props.backgroundColor = color;
              });

              return editor.updateBlock(props.block, {
                type: "table",
                content: {
                  ...props.block.content,
                  rows: newTable,
                },
              });
            },
          }}
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
