import { Menu } from "@mantine/core";
import { IconType } from "react-icons";
import useStyles from "./ToolbarDropdown.styles";
import { ToolbarDropdownTarget } from "./ToolbarDropdownTarget";
import { TiTick } from "react-icons/ti";
import { MouseEvent } from "react";

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
  const { classes } = useStyles(undefined, { name: "ToolbarDropdown" });

  return (
    <Menu
      classNames={{
        arrow: classes.arrow,
        divider: classes.divider,
        dropdown: classes.dropdown,
        label: classes.label,
        item: classes.item,
        itemIcon: classes.itemIcon,
        itemLabel: classes.itemLabel,
        itemRightSection: classes.itemRightSection,
      }}
      exitTransitionDuration={0}>
      <Menu.Target>
        <ToolbarDropdownTarget
          text={props.text}
          icon={props.icon}
          isDisabled={props.isDisabled}
        />
      </Menu.Target>
      <Menu.Dropdown>
        {props.items.map((item) => {
          const ItemIcon = item.icon;
          console.log(item.isSelected);
          return (
            <Menu.Item
              key={item.text}
              onClick={item.onClick}
              icon={ItemIcon && <ItemIcon size={16} />}
              rightSection={
                item.isSelected ? (
                  <TiTick size={16} />
                ) : (
                  // Ensures space for tick even if item isn't currently selected.
                  <div style={{ width: "16px", padding: "0" }} />
                )
              }
              disabled={item.isDisabled}>
              {item.text}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
