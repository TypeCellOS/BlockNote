import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { Menu } from "@mantine/core";
import { DragHandleMenuProps } from "../DragHandleMenuProps";
import { BlockColorsItem } from "./DefaultItems/BlockColorsItem";
import { RemoveBlockItem } from "./DefaultItems/RemoveBlockItem";

/**
 * By default, the DragHandleMenu component will render with default items.
 * However, you can override the items to render by passing children. The
 * children you pass should be:
 *
 * - Default items: Components found within the `/DefaultItems` directory.
 * - Custom items: The `DragHandleMenuItem` component.
 */
export const DragHandleMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & { children?: ReactNode }
) => (
  <Menu.Dropdown className={"bn-drag-handle-menu"}>
    {props.children || (
      <>
        <RemoveBlockItem {...props}>Delete</RemoveBlockItem>
        <BlockColorsItem {...props}>Colors</BlockColorsItem>
      </>
    )}
  </Menu.Dropdown>
);
