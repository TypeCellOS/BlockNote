import {
  BlockNoteEditor,
  DefaultBlockSchema,
  SpecificBlock,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { ReactNode } from "react";

export type TableHandleMenuProps<
  BSchema extends { table: DefaultBlockSchema["table"] }
> = {
  orientation: "row" | "column";
  editor: BlockNoteEditor<BSchema, any, any>;
  block: SpecificBlock<
    { table: DefaultBlockSchema["table"] },
    "table",
    any,
    any
  >;
  index: number;
};

export const TableHandleMenu = (props: { children: ReactNode }) => (
  <Menu.Dropdown className={"bn-table-handle-menu"}>
    {props.children}
  </Menu.Dropdown>
);
