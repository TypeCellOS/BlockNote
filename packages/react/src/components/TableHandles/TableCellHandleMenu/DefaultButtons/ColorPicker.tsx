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
import { TableCellHandleMenuProps } from "../TableCellHandleMenuProps.js";
import { ReactNode } from "react";

export const ColorPickerButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableCellHandleMenuProps<I, S> & {
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

  const currentCell =
    props.block.content.rows[props.rowIndex]?.cells?.[props.colIndex];

  if (!currentCell) {
    return null;
  }

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
            color: isPartialTableCell(currentCell)
              ? currentCell.props.textColor
              : "default",
            setColor: (color) =>
              editor.updateBlock(props.block, {
                type: "table",
                content: {
                  ...props.block.content,
                  rows: props.block.content.rows.map(
                    (row, rowIndex) =>
                      ({
                        ...row,
                        cells:
                          props.rowIndex === rowIndex
                            ? row.cells
                                .map(mapTableCell)
                                .map((cell, cellIndex) =>
                                  cellIndex === props.colIndex
                                    ? {
                                        ...cell,
                                        props: {
                                          ...cell.props,
                                          textColor: color,
                                        },
                                      }
                                    : cell
                                )
                            : row.cells.map(mapTableCell),
                      } as any)
                  ),
                },
              }),
          }}
          background={{
            color: isPartialTableCell(currentCell)
              ? currentCell.props.backgroundColor
              : "default",
            setColor: (color) =>
              editor.updateBlock(props.block, {
                type: "table",
                content: {
                  ...props.block.content,
                  rows: props.block.content.rows.map(
                    (row, rowIndex) =>
                      ({
                        ...row,
                        cells:
                          props.rowIndex === rowIndex
                            ? row.cells
                                .map(mapTableCell)
                                .map((cell, cellIndex) =>
                                  cellIndex === props.colIndex
                                    ? {
                                        ...cell,
                                        props: {
                                          ...cell.props,
                                          backgroundColor: color,
                                        },
                                      }
                                    : cell
                                )
                            : row.cells.map(mapTableCell),
                      } as any)
                  ),
                },
              }),
          }}
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
