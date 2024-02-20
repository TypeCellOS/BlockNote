import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { Menu } from "@mantine/core";
import { DragHandleMenuProps } from "../DragHandleMenuProps";
import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";

export const DragHandleMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & { children?: React.ReactNode }
) => (
  <Menu.Dropdown className={"bn-drag-handle-menu"}>
    {props.children || (
      <>
        <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
        <BlockColorsButton {...props}>Colors</BlockColorsButton>
      </>
    )}
  </Menu.Dropdown>
);
