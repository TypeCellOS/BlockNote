import { ReactNode } from "react";
import { createStyles, Menu } from "@mantine/core";
import { Block, BlockSchema, BlockNoteEditor } from "@blocknote/core";

export type DragHandleMenuProps<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
  block: Block<BSchema>;
  closeMenu: () => void;
};

export const DragHandleMenu = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  return (
    <Menu.Dropdown className={classes.root}>{props.children}</Menu.Dropdown>
  );
};
