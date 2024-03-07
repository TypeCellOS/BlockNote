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

export const AddRowButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & { side: "above" | "below" }
) => {
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <TableHandleMenuItem
      onClick={() => {
        const emptyCol = props.block.content.rows[props.index].cells.map(
          () => []
        );
        const rows = [...props.block.content.rows];
        rows.splice(props.index + (props.side === "below" ? 1 : 0), 0, {
          cells: emptyCol,
        });

        editor.updateBlock(props.block, {
          type: "table",
          content: {
            type: "tableContent",
            rows,
          },
        });
      }}>
      {`Add row ${props.side}`}
    </TableHandleMenuItem>
  );
};

export const AddColumnButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & { side: "left" | "right" }
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
          rows: props.block.content.rows.map((row) => {
            const cells = [...row.cells];
            cells.splice(props.index + (props.side === "right" ? 1 : 0), 0, []);
            return { cells };
          }),
        };

        editor.updateBlock(props.block, {
          type: "table",
          content: content,
        });
      }}>
      {`Add column ${props.side}`}
    </TableHandleMenuItem>
  );
};

export const AddButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> &
    (
      | { orientation: "row"; side: "above" | "below" }
      | { orientation: "column"; side: "left" | "right" }
    )
) =>
  props.orientation === "row" ? (
    <AddRowButton {...props} side={props.side} />
  ) : (
    <AddColumnButton {...props} side={props.side} />
  );
