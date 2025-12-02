import { ReactNode } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { AddButton } from "./DefaultButtons/AddButton.js";
import { DeleteButton } from "./DefaultButtons/DeleteButton.js";
import { ColorPickerButton } from "./DefaultButtons/ColorPicker.js";
import { TableHeaderColumnButton } from "./DefaultButtons/TableHeaderButton.js";
import { TableHeaderRowButton } from "./DefaultButtons/TableHeaderButton.js";
import { TableHandleMenuProps } from "./TableHandleMenuProps.js";

export const TableHandleMenu = (
  props: TableHandleMenuProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Dropdown className={"bn-table-handle-menu"}>
      {props.children || (
        <>
          <DeleteButton orientation={props.orientation} />
          <AddButton
            orientation={props.orientation}
            side={props.orientation === "row" ? "above" : ("left" as any)}
          />
          <AddButton
            orientation={props.orientation}
            side={props.orientation === "row" ? "below" : ("right" as any)}
          />
          <TableHeaderRowButton orientation={props.orientation} />
          <TableHeaderColumnButton orientation={props.orientation} />
          <ColorPickerButton orientation={props.orientation} />
        </>
      )}
    </Components.Generic.Menu.Dropdown>
  );
};
