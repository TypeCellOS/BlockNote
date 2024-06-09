import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableContent,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../../i18n/dictionary";
import { TableHandleMenuProps } from "../TableHandleMenuProps";

export const DeleteRowButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        const content: TableContent<I, S> = {
          type: "tableContent",
          rows: props.block.content.rows.filter(
            (_, index) => index !== props.index
          ),
        };

        editor.updateBlock(props.block, {
          type: "table",
          content,
        });
      }}>
      {dict.table_handle.delete_row_menuitem}
    </Components.Generic.Menu.Item>
  );
};

export const DeleteColumnButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        const content: TableContent<I, S> = {
          type: "tableContent",
          rows: props.block.content.rows.map((row) => ({
            cells: row.cells.filter((_, index) => index !== props.index),
          })),
        };

        editor.updateBlock(props.block, {
          type: "table",
          content,
        });
      }}>
      {dict.table_handle.delete_column_menuitem}
    </Components.Generic.Menu.Item>
  );
};

export const DeleteButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & { orientation: "row" | "column" }
) =>
  props.orientation === "row" ? (
    <DeleteRowButton {...props} />
  ) : (
    <DeleteColumnButton {...props} />
  );
