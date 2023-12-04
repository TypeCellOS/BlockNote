import { DefaultBlockSchema } from "@blocknote/core";
import { TableHandleMenu, TableHandleMenuProps } from "./TableHandleMenu";
import { AddButton } from "./DefaultButtons/AddButton";
import { DeleteButton } from "./DefaultButtons/DeleteButton";

export const DefaultTableHandleMenu = <
  BSchema extends { table: DefaultBlockSchema["table"] }
>(
  props: TableHandleMenuProps<BSchema>
) => (
  <TableHandleMenu>
    <DeleteButton
      orientation={props.orientation}
      editor={props.editor}
      block={props.block}
      index={props.index}
    />
    <AddButton
      orientation={props.orientation}
      editor={props.editor}
      block={props.block}
      index={props.index}
      side={props.orientation === "row" ? "above" : ("left" as any)}
    />
    <AddButton
      orientation={props.orientation}
      editor={props.editor}
      block={props.block}
      index={props.index}
      side={props.orientation === "row" ? "below" : ("right" as any)}
    />
  </TableHandleMenu>
);
