import { TableHandles } from "@blocknote/core/extensions";
import { ReactNode } from "react";
import { MdArrowDropDown } from "react-icons/md";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { usePlugin } from "../../hooks/usePlugin.js";
import { TableCellButtonProps } from "./TableCellButtonProps.js";
import { TableCellMenu } from "./TableCellMenu/TableCellMenu.js";

/**
 * By default, the TableCellHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableCellButton = (
  props: TableCellButtonProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const tableHandles = usePlugin(TableHandles);

  const Component = props.tableCellMenu || TableCellMenu;

  if (
    !editor.settings.tables.splitCells &&
    !editor.settings.tables.cellBackgroundColor &&
    !editor.settings.tables.cellTextColor
  ) {
    // Hide the button altogether if all table cell settings are disabled
    return null;
  }

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          tableHandles.freezeHandles();
        } else {
          tableHandles.unfreezeHandles();
          editor.focus();
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
      <Component />
    </Components.Generic.Menu.Root>
  );
};
