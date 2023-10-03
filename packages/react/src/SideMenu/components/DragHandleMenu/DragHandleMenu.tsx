import { ReactNode } from "react";
import { createStyles, Menu } from "@mantine/core";
import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";

export type DragHandleMenuProps<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
  block: Block<BSchema>;
};

export const DragHandleMenu = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  return (
    <Menu.Dropdown className={classes.root} style={{ overflow: "visible" }}>
      {props.children}
    </Menu.Dropdown>
  );
};
