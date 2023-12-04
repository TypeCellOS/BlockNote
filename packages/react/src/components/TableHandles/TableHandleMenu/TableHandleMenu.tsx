import {
  BlockNoteEditor,
  DefaultBlockSchema,
  SpecificBlock,
} from "@blocknote/core";
import { Menu, createStyles } from "@mantine/core";
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

export const TableHandleMenu = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "TableHandleMenu",
  });

  return (
    <Menu.Dropdown className={classes.root} style={{ overflow: "visible" }}>
      {props.children}
    </Menu.Dropdown>
  );
};
