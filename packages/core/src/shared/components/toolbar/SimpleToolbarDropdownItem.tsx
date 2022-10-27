import { Menu } from "@mantine/core";
import React from "react";
import { TiTick } from "react-icons/ti";
import { IconType } from "react-icons";

export type SimpleToolbarDropdownItemProps = {
  onClick?: (e: React.MouseEvent) => void;
  text: string;
  icon?: IconType;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

export function SimpleToolbarDropdownItem(
  props: SimpleToolbarDropdownItemProps
) {
  const ItemIcon = props.icon;
  return (
    <Menu.Item
      onClick={props.onClick}
      icon={ItemIcon && <ItemIcon />}
      rightSection={
        props.isSelected ? (
          <TiTick />
        ) : (
          // Ensures space for tick even if item isn't currently selected
          <div style={{ width: "12px", padding: "0" }} />
        )
      }
      disabled={props.isDisabled}>
      {props.text}
    </Menu.Item>
  );
}
