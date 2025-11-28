import { getColspan, getRowspan, isTableCell } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";

export const SplitButton = () => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<any, any, any>();

  const tableHandles = useExtension(TableHandlesExtension);
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

  if (block === undefined || colIndex === undefined || rowIndex === undefined) {
    return null;
  }

  const currentCell = block.content.rows[rowIndex]?.cells?.[colIndex];

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
        tableHandles.splitCell({
          row: rowIndex,
          col: colIndex,
        });
      }}
    >
      {dict.table_handle.split_cell_menuitem}
    </Components.Generic.Menu.Item>
  );
};
