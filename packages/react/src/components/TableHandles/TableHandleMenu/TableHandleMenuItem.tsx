import { Menu, MenuItemProps } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";

export const TableHandleMenuItem = (
  props: PolymorphicComponentProps<"button"> & MenuItemProps
) => {
  const { children, ...remainingProps } = props;
  return <Menu.Item {...remainingProps}>{children}</Menu.Item>;
};
