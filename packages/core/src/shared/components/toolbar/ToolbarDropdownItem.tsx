import { Menu } from "@mantine/core";
import { IconType } from "react-icons";
import { TiTick } from "react-icons/ti";
import { MouseEvent } from "react";

export type ToolbarDropdownItemProps = {
  onClick?: (e: MouseEvent) => void;
  text: string;
  icon?: IconType;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

export function ToolbarDropdownItem(props: ToolbarDropdownItemProps) {
  const ItemIcon = props.icon;

  return (
    <Menu.Item
      key={props.text}
      onClick={props.onClick}
      icon={ItemIcon && <ItemIcon size={16} />}
      rightSection={
        props.isSelected ? (
          <TiTick size={16} />
        ) : (
          // Ensures space for tick even if item isn't currently selected.
          <div style={{ width: "16px", padding: "0" }} />
        )
      }
      disabled={props.isDisabled}>
      {props.text}
    </Menu.Item>
  );
}
