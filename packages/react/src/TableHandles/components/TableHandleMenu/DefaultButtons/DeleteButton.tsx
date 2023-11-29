import {
  DefaultBlockSchema,
  PartialBlock,
  TableContent,
} from "@blocknote/core";
import { TableHandleMenuProps } from "../TableHandleMenu";
import { TableHandleMenuItem } from "../TableHandleMenuItem";

export const DeleteRowButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema>
) => (
  <TableHandleMenuItem
    onClick={() => {
      const content: TableContent<any, any> = {
        type: "tableContent",
        rows: props.block.content.rows.filter(
          (_, index) => index !== props.index
        ),
      };

      props.editor.updateBlock(props.block, {
        type: "table",
        content,
      } as PartialBlock<BSchema, any, any>);
    }}>
    Delete row
  </TableHandleMenuItem>
);

export const DeleteColumnButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema>
) => (
  <TableHandleMenuItem
    onClick={() => {
      const content: TableContent<any, any> = {
        type: "tableContent",
        rows: props.block.content.rows.map((row) => ({
          cells: row.cells.filter((_, index) => index !== props.index),
        })),
      };

      props.editor.updateBlock(props.block, {
        type: "table",
        content,
      } as PartialBlock<BSchema, any, any>);
    }}>
    Delete column
  </TableHandleMenuItem>
);

export const DeleteButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema> & { orientation: "row" | "column" }
) =>
  props.orientation === "row" ? (
    <DeleteRowButton {...props} />
  ) : (
    <DeleteColumnButton {...props} />
  );
