import { ReactNode } from "react";
import { createStyles, Menu } from "@mantine/core";
import { Block, BlockNoteEditor } from "@blocknote/core";

export type DragHandleMenuProps = {
  editor: BlockNoteEditor;
  block: Block;
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
