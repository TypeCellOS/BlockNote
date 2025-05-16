import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { AddButton } from "./DefaultButtons/AddButton.js";
import { DeleteButton } from "./DefaultButtons/DeleteButton.js";
import { TableHandleMenuProps } from "./TableHandleMenuProps.js";
import { ColorPickerButton } from "./DefaultButtons/ColorPicker.js";
import { TableHeaderColumnButton } from "./DefaultButtons/TableHeaderButton.js";
import { TableHeaderRowButton } from "./DefaultButtons/TableHeaderButton.js";

export const TableHandleMenu = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableHandleMenuProps<I, S> & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Dropdown className={"bn-table-handle-menu"}>
      {props.children || (
        <>
          <DeleteButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
          />
          <AddButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
            side={props.orientation === "row" ? "above" : ("left" as any)}
          />
          <AddButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
            side={props.orientation === "row" ? "below" : ("right" as any)}
          />
          <TableHeaderRowButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
          />
          <TableHeaderColumnButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
          />
          <ColorPickerButton
            orientation={props.orientation}
            block={props.block}
            index={props.index}
          />
        </>
      )}
    </Components.Generic.Menu.Dropdown>
  );
};
