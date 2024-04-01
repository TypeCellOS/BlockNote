import { Menu } from "@mantine/core";
import type { IconType } from "react-icons";
import { TiTick } from "react-icons/ti";

export type ToolbarSelectItemProps = {
  text: string;
  icon?: IconType;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
};

export function ToolbarSelectItem(props: ToolbarSelectItemProps) {
  const ItemIcon = props.icon;

  return (
    <Menu.Item
      key={props.text}
      onClick={props.onClick}
      leftSection={ItemIcon && <ItemIcon size={16} />}
      rightSection={
        props.isSelected ? (
          <TiTick size={20} className={"bn-tick-icon"} />
        ) : (
          // Ensures space for tick even if item isn't currently selected.
          <div className={"bn-tick-space"} />
        )
      }
      disabled={props.isDisabled}>
      {props.text}
    </Menu.Item>
  );
}
