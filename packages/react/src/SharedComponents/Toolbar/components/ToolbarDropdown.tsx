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
  const item = props.items.filter(
    (p) => p.isSelected
  )[0];

  if (item) {
    const { isSelected, ...activeItem } = item;

    if (activeItem) {
      return (
        <Menu exitTransitionDuration={0} disabled={props.isDisabled}>
          <Menu.Target>
            <ToolbarDropdownTarget
              text={activeItem.text}
              icon={activeItem.icon}
              isDisabled={activeItem.isDisabled}
            />
          </Menu.Target>
          <Menu.Dropdown>
            {props.items.map((item) => (
              <ToolbarDropdownItem key={item.text} {...item} />
            ))}
          </Menu.Dropdown>
        </Menu>
      );
    }
  }

  return <></>
}
