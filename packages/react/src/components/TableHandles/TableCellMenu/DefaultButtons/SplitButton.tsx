import {
  getColspan,
  getRowspan,
  isTableCell,
  TableHandlesPlugin,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { usePlugin, usePluginState } from "../../../../hooks/usePlugin.js";

export const SplitButton = () => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<any, any, any>();

  const tableHandles = usePlugin(TableHandlesPlugin);
  const block = usePluginState(TableHandlesPlugin, {
    selector: (state) => state?.block,
  });
  const colIndex = usePluginState(TableHandlesPlugin, {
    selector: (state) => state?.colIndex,
  });
  const rowIndex = usePluginState(TableHandlesPlugin, {
    selector: (state) => state?.rowIndex,
  });

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
