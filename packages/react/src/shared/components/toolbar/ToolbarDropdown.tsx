import { Menu } from "@mantine/core";
import { IconType } from "react-icons";
import { ToolbarDropdownTarget } from "./ToolbarDropdownTarget";
import { MouseEvent } from "react";
import { ToolbarDropdownItem } from "./ToolbarDropdownItem";

export type ToolbarDropdownProps = {
  text: string;
  icon?: IconType;
  items: Array<{
    onClick?: (e: MouseEvent) => void;
    text: string;
    icon?: IconType;
    isSelected?: boolean;
    children?: any;
    isDisabled?: boolean;
  }>;
  children?: any;
  isDisabled?: boolean;
};

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  return (
    <Menu exitTransitionDuration={0}>
      <Menu.Target>
        <ToolbarDropdownTarget {...props} />
      </Menu.Target>
      <Menu.Dropdown>
        {props.items.map((item) => (
          <ToolbarDropdownItem key={item.text} {...item} />
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
