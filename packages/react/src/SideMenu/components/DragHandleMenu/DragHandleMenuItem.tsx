import { Menu } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";

export const DragHandleMenuItem = (
  props: PolymorphicComponentProps<"button"> & { closeMenuOnClick?: boolean }
) => {
  const { children, ...remainingProps } = props;
  return <Menu.Item {...remainingProps}>{children}</Menu.Item>;
};
