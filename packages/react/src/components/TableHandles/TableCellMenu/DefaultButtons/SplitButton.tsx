import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  getColspan,
  getRowspan,
  InlineContentSchema,
  isTableCell,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { TableCellMenuProps } from "../TableCellMenuProps.js";

export const SplitButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableCellMenuProps<I, S>,
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

  if (
    !currentCell ||
    !isTableCell(currentCell) ||
    (getRowspan(currentCell) === 1 && getColspan(currentCell) === 1) ||
    !editor.settings.tables.splitCells
  ) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        editor.tableHandles?.splitCell({
          row: props.rowIndex,
          col: props.colIndex,
        });
      }}
    >
      {dict.table_handle.split_cell_menuitem}
    </Components.Generic.Menu.Item>
  );
};
