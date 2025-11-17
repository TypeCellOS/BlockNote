import { TableHandlesPlugin } from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { usePlugin, usePluginState } from "../../../../hooks/usePlugin.js";

export const DeleteButton = (props: { orientation: "row" | "column" }) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const tableHandles = usePlugin(TableHandlesPlugin);
  const index = usePluginState(TableHandlesPlugin, {
    selector: (state) =>
      props.orientation === "column" ? state?.colIndex : state?.rowIndex,
  });

  if (tableHandles === undefined || index === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => tableHandles.removeRowOrColumn(index, props.orientation)}
    >
      {props.orientation === "row"
        ? dict.table_handle.delete_row_menuitem
        : dict.table_handle.delete_column_menuitem}
    </Components.Generic.Menu.Item>
  );
};
