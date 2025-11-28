import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";
import { useDictionary } from "../../../../i18n/dictionary.js";

export const TableHeaderRowButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  orientation: "row" | "column";
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

  if (
    tableHandles === undefined ||
    block === undefined ||
    index !== 0 ||
    props.orientation !== "row" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // We only support 1 header row for now
  const isHeaderRow = Boolean(block.content.headerRows);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderRow}
      onClick={() => {
        editor.updateBlock(block, {
          ...block,
          content: {
            ...block.content,
            headerRows: isHeaderRow ? undefined : 1,
          } as any,
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
>(props: {
  orientation: "row" | "column";
}) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();
  const tableHandles = useExtension(TableHandlesExtension);
  const block = useExtensionState(TableHandlesExtension, {
    selector: (state) => state?.block,
  });
  const index = useExtensionState(TableHandlesExtension, {
    selector: (state) =>
      props.orientation === "column" ? state?.colIndex : state?.rowIndex,
  });

  if (
    !tableHandles ||
    index !== 0 ||
    !block ||
    props.orientation !== "column" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // We only support 1 header column for now
  const isHeaderColumn = Boolean(block.content.headerCols);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderColumn}
      onClick={() => {
        editor.updateBlock(block, {
          ...block,
          content: {
            ...block.content,
            headerCols: isHeaderColumn ? undefined : 1,
          } as any,
        });
      }}
    >
      {dict.drag_handle.header_column_menuitem}
    </Components.Generic.Menu.Item>
  );
};
