import { Menu } from "@mantine/core";
import { ReactNode } from "react";

export const DragHandleMenuWrapper = (props: { children: ReactNode }) => (
  <Menu.Dropdown className={"bn-drag-handle-menu"}>
    {props.children}
  </Menu.Dropdown>
);
