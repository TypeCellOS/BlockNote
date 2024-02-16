import { Menu } from "@mantine/core";
import { ReactNode } from "react";

export const TableHandleMenu = (props: { children: ReactNode }) => (
  <Menu.Dropdown className={"bn-table-handle-menu"}>
    {props.children}
  </Menu.Dropdown>
);
