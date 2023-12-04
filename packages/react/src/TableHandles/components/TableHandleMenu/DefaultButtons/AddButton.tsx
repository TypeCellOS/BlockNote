import {
  DefaultBlockSchema,
  PartialBlock,
  TableContent,
} from "@blocknote/core";
import { TableHandleMenuProps } from "../TableHandleMenu";
import { TableHandleMenuItem } from "../TableHandleMenuItem";

export const AddRowButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema> & { side: "above" | "below" }
) => (
  <TableHandleMenuItem
    onClick={() => {
      const emptyCol = props.block.content.rows[props.index].cells.map(
        () => []
      );
      const rows = [...props.block.content.rows];
      rows.splice(props.index + (props.side === "below" ? 1 : 0), 0, {
        cells: emptyCol,
      });

      props.editor.updateBlock(props.block, {
        type: "table",
        content: {
          type: "tableContent",
          rows,
        },
      } as PartialBlock<BSchema, any, any>);
    }}>
    {`Add row ${props.side}`}
  </TableHandleMenuItem>
);

export const AddColumnButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema> & { side: "left" | "right" }
) => (
  <TableHandleMenuItem
    onClick={() => {
      const content: TableContent<any, any> = {
        type: "tableContent",
        rows: props.block.content.rows.map((row) => {
          const cells = [...row.cells];
          cells.splice(props.index + (props.side === "right" ? 1 : 0), 0, []);
          return { cells };
        }),
      };

      props.editor.updateBlock(props.block, {
        type: "table",
        content: content,
      } as PartialBlock<BSchema, any, any>);
    }}>
    {`Add column ${props.side}`}
  </TableHandleMenuItem>
);

export const AddButton = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema> &
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
