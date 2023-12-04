import { Menu, MenuItemProps } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";

export const DragHandleMenuItem = (
  props: PolymorphicComponentProps<"button"> & MenuItemProps
) => {
  const { children, ...remainingProps } = props;
  return <Menu.Item {...remainingProps}>{children}</Menu.Item>;
};
