import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { TableHandleMenuProps } from "../TableHandleMenuProps.js";
import { useDictionary } from "../../../../i18n/dictionary.js";

export const TableHeaderRowButton = <
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

  if (
    !tableHandles ||
    props.index !== 0 ||
    props.orientation !== "row" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // We only support 1 header row for now
  const isHeaderRow = Boolean(props.block.content.headerRows);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderRow}
      onClick={() => {
        // The block may have been modified and out of date, so we get the latest block
        const block = editor.getBlock(props.block.id);
        if (!block) {
          return;
        }
        editor.updateBlock(block, {
          ...block,
          content: {
            ...block.content,
            headerRows: isHeaderRow ? undefined : 1,
          },
        });
      }}
    >
      {dict.drag_handle.header_row_menuitem}
    </Components.Generic.Menu.Item>
  );
};

export const TableHeaderColumnButton = <
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

  if (
    !tableHandles ||
    props.index !== 0 ||
    props.orientation !== "column" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // We only support 1 header column for now
  const isHeaderColumn = Boolean(props.block.content.headerCols);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderColumn}
      onClick={() => {
        // The block may have been modified and out of date, so we get the latest block
        const block = editor.getBlock(props.block.id);
        if (!block) {
          return;
        }
        editor.updateBlock(block, {
          ...block,
          content: {
            ...block.content,
            headerCols: isHeaderColumn ? undefined : 1,
          },
        });
      }}
    >
      {dict.drag_handle.header_column_menuitem}
    </Components.Generic.Menu.Item>
  );
};
