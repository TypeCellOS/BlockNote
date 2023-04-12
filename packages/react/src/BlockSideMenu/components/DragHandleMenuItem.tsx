import { Menu } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";

export type DragHandleMenuItemProps = PolymorphicComponentProps<"button"> & {
  closeMenu: () => void;
};

export const DragHandleMenuItem = (props: DragHandleMenuItemProps) => (
  <Menu.Item
    {...props}
    onClick={(event) => {
      props.closeMenu();
      props.onClick?.(event);
    }}>
    {props.children}
  </Menu.Item>
);
