import { Menu } from "@mantine/core";
import {
  ToolbarDropdownItem,
  ToolbarDropdownItemProps,
} from "./ToolbarDropdownItem";
import { ToolbarDropdownTarget } from "./ToolbarDropdownTarget";

export type ToolbarDropdownProps = {
  items: ToolbarDropdownItemProps[];
  isDisabled?: boolean;
};

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <Menu exitTransitionDuration={0} disabled={props.isDisabled}>
      <Menu.Target>
        <ToolbarDropdownTarget
          text={selectedItem.text}
          icon={selectedItem.icon}
          isDisabled={selectedItem.isDisabled}
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
