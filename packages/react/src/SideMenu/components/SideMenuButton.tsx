import { ActionIcon } from "@mantine/core";

export const SideMenuButton = (props: { children: JSX.Element }) => (
  <ActionIcon size={24}>{props.children}</ActionIcon>
);
