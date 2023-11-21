import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
} from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";
import { Menu, createStyles } from "@mantine/core";
import { ReactNode } from "react";

export type DragHandleMenuProps<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  block: Block<BSchema, I, S>;
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
