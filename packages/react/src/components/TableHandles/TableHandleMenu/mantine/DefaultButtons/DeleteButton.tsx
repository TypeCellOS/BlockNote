import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableContent,
} from "@blocknote/core";

import { TableHandleMenuProps } from "../../TableHandleMenuProps";
import { TableHandleMenuItem } from "../TableHandleMenuItem";
import { useBlockNoteEditor } from "../../../../../hooks/useBlockNoteEditor";

export const DeleteRowButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <TableHandleMenuItem
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
      Delete row
    </TableHandleMenuItem>
  );
};

export const DeleteColumnButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <TableHandleMenuItem
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
      Delete column
    </TableHandleMenuItem>
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
