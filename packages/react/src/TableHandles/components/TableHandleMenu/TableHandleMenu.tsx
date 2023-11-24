import { ReactNode } from "react";
import { Block, BlockNoteEditor, DefaultBlockSchema } from "@blocknote/core";
import { createStyles, Menu } from "@mantine/core";

export type TableHandleMenuProps<
  BSchema extends { table: DefaultBlockSchema["table"] }
> = {
  orientation: "row" | "column";
  editor: BlockNoteEditor<BSchema>;
  block: Block<BSchema>;
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
