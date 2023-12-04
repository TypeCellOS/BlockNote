import { Menu } from "@mantine/core";
import {
  ToolbarDropdownItem,
  ToolbarDropdownItemProps,
} from "./ToolbarDropdownItem";
import { ToolbarDropdownTarget } from "./ToolbarDropdownTarget";
import { usePreventMenuOverflow } from "../../hooks/usePreventMenuOverflow";

export type ToolbarDropdownProps = {
  items: ToolbarDropdownItemProps[];
  isDisabled?: boolean;
};

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

  if (!selectedItem) {
    return null;
  }

  return (
    <Menu
      exitTransitionDuration={0}
      disabled={props.isDisabled}
      onOpen={updateMaxHeight}>
      <Menu.Target>
        <ToolbarDropdownTarget
          text={selectedItem.text}
          icon={selectedItem.icon}
          isDisabled={selectedItem.isDisabled}
        />
      </Menu.Target>
      <div ref={ref}>
        <Menu.Dropdown>
          {props.items.map((item) => (
            <ToolbarDropdownItem key={item.text} {...item} />
          ))}
        </Menu.Dropdown>
      </div>
    </Menu>
  );
}
