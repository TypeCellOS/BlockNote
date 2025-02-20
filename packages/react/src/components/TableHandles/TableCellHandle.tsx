import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { createPortal } from "react-dom";
import { MdArrowDropDown } from "react-icons/md";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { TableCellHandleProps } from "./TableCellHandleProps.js";
import { TableCellHandleMenu } from "./TableCellHandleMenu/TableCellHandleMenu.js";

/**
 * By default, the TableHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableCellHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableCellHandleProps<I, S> & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  const Component = props.tableCellHandleMenu || TableCellHandleMenu;

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          props.freezeHandles();
        } else {
          props.unfreezeHandles();
          props.editor.focus();
        }
      }}
      position={"right"}>
      <Components.Generic.Menu.Trigger>
        {/* TODO we should probably make a generic button (wait for comments PR to land) */}
        <div>
          {props.children || (
            <MdArrowDropDown size={14} data-test={"tableHandle"} />
          )}
        </div>
      </Components.Generic.Menu.Trigger>
      {/* the menu can extend outside of the table, so we use a portal to prevent clipping */}
      {createPortal(
        <Component
          block={props.block as any}
          rowIndex={props.rowIndex}
          colIndex={props.colIndex}
        />,
        props.menuContainer
      )}
    </Components.Generic.Menu.Root>
  );
};
