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
import { TableCellButtonProps } from "./TableCellButtonProps.js";
import { TableCellMenu } from "./TableCellMenu/TableCellMenu.js";

/**
 * By default, the TableCellHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableCellButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableCellButtonProps<I, S> & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  const Component = props.tableCellMenu || TableCellMenu;

  if (
    !props.editor.settings.tables.splitCells &&
    !props.editor.settings.tables.cellBackgroundColor &&
    !props.editor.settings.tables.cellTextColor
  ) {
    // Hide the button altogether if all table cell settings are disabled
    return null;
  }

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
      position={"right"}
    >
      <Components.Generic.Menu.Trigger>
        <Components.Generic.Menu.Button className={"bn-table-cell-handle"}>
          {props.children || (
            <MdArrowDropDown size={12} data-test={"tableCellHandle"} />
          )}
        </Components.Generic.Menu.Button>
      </Components.Generic.Menu.Trigger>
      {/* the menu can extend outside of the table, so we use a portal to prevent clipping */}
      {createPortal(
        <Component
          block={props.block as any}
          rowIndex={props.rowIndex}
          colIndex={props.colIndex}
        />,
        props.menuContainer,
      )}
    </Components.Generic.Menu.Root>
  );
};
