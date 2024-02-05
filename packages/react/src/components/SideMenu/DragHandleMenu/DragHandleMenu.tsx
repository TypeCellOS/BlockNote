import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { ReactNode } from "react";

export type DragHandleMenuProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  block: Block<BSchema, I, S>;
};

export const DragHandleMenu = (props: { children: ReactNode }) => (
  <Menu.Dropdown className={"bn-drag-handle-menu"}>
    {props.children}
  </Menu.Dropdown>
);
