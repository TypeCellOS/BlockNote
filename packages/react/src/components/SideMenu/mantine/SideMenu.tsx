import { Group } from "@mantine/core";
import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { SideMenuProps } from "../SideMenuProps";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandleButton } from "./DefaultButtons/DragHandleButton";

// TODO: props.dragHandleMenu should only be available if no children are passed
/**
 * By default, the SideMenu component will render with default buttons. However,
 * you can override the buttons to render by passing children. The children you
 * pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom buttons: The `SideMenuButton` component.
 */
export const SideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: SideMenuProps<BSchema, I, S> & { children?: ReactNode }
) => {
  const { addBlock, ...rest } = props;

  return (
    <Group className={"bn-side-menu"} gap={0}>
      {props.children || (
        <>
          <AddBlockButton addBlock={addBlock} />
          <DragHandleButton {...rest} />
        </>
      )}
    </Group>
  );
};
