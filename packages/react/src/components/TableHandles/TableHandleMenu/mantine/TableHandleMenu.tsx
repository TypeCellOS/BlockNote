import { Menu } from "@mantine/core";
import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { TableHandleMenuProps } from "../TableHandleMenuProps";
import { AddButton } from "./DefaultButtons/AddButton";
import { DeleteButton } from "./DefaultButtons/DeleteButton";

export const TableHandleMenu = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & { children?: ReactNode }
) => (
  <Menu.Dropdown className={"bn-table-handle-menu"}>
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
      </>
    )}
  </Menu.Dropdown>
);
