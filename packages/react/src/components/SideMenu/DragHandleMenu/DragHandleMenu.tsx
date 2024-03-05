import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { ReactNode } from "react";

export type DragHandleMenuProps<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  block: Block<BSchema, I, S>;
};

export const DragHandleMenu = (props: { children: ReactNode }) => (
  <Menu.Dropdown className={"bn-drag-handle-menu"}>
    {props.children}
  </Menu.Dropdown>
);
