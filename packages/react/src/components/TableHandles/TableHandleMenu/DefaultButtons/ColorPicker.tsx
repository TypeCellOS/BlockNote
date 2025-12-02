import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  isTableCell,
  mapTableCell,
  StyleSchema,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";
import { ReactNode, useMemo } from "react";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";

export const ColorPickerButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  orientation: "row" | "column";
  children?: ReactNode;
}) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  const tableHandles = useExtension(TableHandlesExtension);
  const { block, index } = useExtensionState(TableHandlesExtension, {
    selector: (state) => ({
      block: state?.block,
      index: props.orientation === "column" ? state?.colIndex : state?.rowIndex,
    }),
  });

  const currentCells = useMemo(() => {
    if (
      tableHandles === undefined ||
      block === undefined ||
      index === undefined
    ) {
      return [];
    }

    if (props.orientation === "row") {
      return tableHandles.getCellsAtRowHandle(block, index);
    }

    return tableHandles.getCellsAtColumnHandle(block, index);
  }, [block, index, props.orientation, tableHandles]);

  const updateColor = (color: string, type: "text" | "background") => {
    if (block === undefined) {
      return;
    }

    const newTable = block.content.rows.map((row) => {
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

    editor.updateBlock(block, {
      type: "table",
      content: {
        ...block.content,
        rows: newTable,
      } as any,
    });

    // Have to reset text cursor position to the block as `updateBlock`
    // moves the existing selection out of the block.
    editor.setTextCursorPosition(block);
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
