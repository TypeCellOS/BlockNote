import { ReactNode } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { BlockColorsItem } from "./DefaultItems/BlockColorsItem.js";
import { RemoveBlockItem } from "./DefaultItems/RemoveBlockItem.js";
import {
  TableColumnHeaderItem,
  TableRowHeaderItem,
} from "./DefaultItems/TableHeadersItem.js";

/**
 * By default, the DragHandleMenu component will render with default items.
 * However, you can override the items to render by passing children. The
 * children you pass should be:
 *
 * - Default items: Components found within the `/DefaultItems` directory.
 * - Custom items: The `DragHandleMenuItem` component.
 */
export const DragHandleMenu = (props: { children?: ReactNode }) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  return (
    <Components.Generic.Menu.Dropdown
      className={"bn-menu-dropdown bn-drag-handle-menu"}
    >
      {props.children || (
        <>
          <RemoveBlockItem>{dict.drag_handle.delete_menuitem}</RemoveBlockItem>
          <BlockColorsItem>{dict.drag_handle.colors_menuitem}</BlockColorsItem>
          <TableRowHeaderItem>
            {dict.drag_handle.header_row_menuitem}
          </TableRowHeaderItem>
          <TableColumnHeaderItem>
            {dict.drag_handle.header_column_menuitem}
          </TableColumnHeaderItem>
        </>
      )}
    </Components.Generic.Menu.Dropdown>
  );
};
