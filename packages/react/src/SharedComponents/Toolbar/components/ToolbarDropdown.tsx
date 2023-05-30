import { Menu } from "@mantine/core";
import { MouseEvent } from "react";
import { IconType } from "react-icons";
import { ToolbarDropdownItem } from "./ToolbarDropdownItem";
import { ToolbarDropdownTarget } from "./ToolbarDropdownTarget";

export type ToolbarDropdownProps = {
  items: Array<{
    onClick?: (e: MouseEvent) => void;
    text: string;
    icon?: IconType;
    isSelected?: boolean;
    isDisabled?: boolean;
  }>;
  isDisabled?: boolean;
};

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  const activeItem = props.items.filter((p) => p.isSelected)[0];

  if (!activeItem) {
    return null;
  }

  return (
    <Menu exitTransitionDuration={0} disabled={props.isDisabled}>
      <Menu.Target>
        <ToolbarDropdownTarget {...activeItem} />
      </Menu.Target>
      <Menu.Dropdown>
        {props.items.map((item) => (
          <ToolbarDropdownItem key={item.text} {...item} />
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
