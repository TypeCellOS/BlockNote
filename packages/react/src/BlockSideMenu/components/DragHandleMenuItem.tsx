import { ReactNode } from "react";
import { Menu } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";
import { BlockNoteEditor } from "@blocknote/core";

export type DragHandleMenuItemProps = PolymorphicComponentProps<"button"> & {
  editor: BlockNoteEditor;
  closeMenu: () => void;
  children: ReactNode;
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
