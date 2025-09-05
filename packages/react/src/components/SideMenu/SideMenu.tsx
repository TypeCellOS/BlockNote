import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useMemo } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton.js";
import { DragHandleButton } from "./DefaultButtons/DragHandleButton.js";
import { SideMenuProps } from "./SideMenuProps.js";

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
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: SideMenuProps<BSchema, I, S> & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  const dataAttributes = useMemo(() => {
    const attrs: Record<string, string> = {
      "data-block-type": props.block.type,
    };

    if (props.block.type === "heading") {
      attrs["data-level"] = (props.block.props as any).level.toString();
    }

    if (
      props.editor.schema.blockSpecs[props.block.type].implementation.meta
        ?.fileBlockAccept
    ) {
      if (props.block.props.url) {
        attrs["data-url"] = "true";
      } else {
        attrs["data-url"] = "false";
      }
    }

    return attrs;
  }, [props.block.props, props.block.type, props.editor.schema.blockSpecs]);

  return (
    <Components.SideMenu.Root className={"bn-side-menu"} {...dataAttributes}>
      {props.children || (
        <>
          <AddBlockButton {...props} />
          <DragHandleButton {...props} />
        </>
      )}
    </Components.SideMenu.Root>
  );
};
