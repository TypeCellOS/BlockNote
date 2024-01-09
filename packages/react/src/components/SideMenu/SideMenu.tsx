import { Group } from "@mantine/core";
import { ReactNode } from "react";

export const SideMenu = (props: { children: ReactNode }) => (
  <Group className={"bn-side-menu"} gap={0}>
    {props.children}
  </Group>
);
