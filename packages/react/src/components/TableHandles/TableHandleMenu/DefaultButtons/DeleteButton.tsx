import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { TableHandleMenuProps } from "../TableHandleMenuProps.js";

export const DeleteButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableHandleMenuProps<I, S> & { orientation: "row" | "column" },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  const tableHandles = editor.tableHandles;

  if (!tableHandles) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        tableHandles.removeRowOrColumn(props.index, props.orientation);
      }}
    >
      {props.orientation === "row"
        ? dict.table_handle.delete_row_menuitem
        : dict.table_handle.delete_column_menuitem}
    </Components.Generic.Menu.Item>
  );
};
