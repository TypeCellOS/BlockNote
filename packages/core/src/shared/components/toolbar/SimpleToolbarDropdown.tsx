import { Button, Menu } from "@mantine/core";
import {
  SimpleToolbarDropdownItem,
  SimpleToolbarDropdownItemProps,
} from "./SimpleToolbarDropdownItem";
import { HiChevronDown } from "react-icons/hi";
import { IconType } from "react-icons";
import { FocusEvent } from "react";

export type SimpleToolbarDropdownProps = {
  text: string;
  icon?: IconType;
  items: Array<SimpleToolbarDropdownItemProps>;
  children?: any;
  isDisabled?: boolean;
};

export function SimpleToolbarDropdown(props: SimpleToolbarDropdownProps) {
  const TargetIcon = props.icon;
  return (
    <Menu
      exitTransitionDuration={0}
      styles={{
        item: {
          fontSize: "12px",
        },
        // Adds some space between the item text and selection tick
        itemRightSection: {
          paddingLeft: "10px",
        },
      }}>
      <Menu.Target>
        <Button
          onMouseDown={(event: React.MouseEvent) => {
            // Prevents focus being moved from the editor to the button.
            event.preventDefault();
          }}
          leftIcon={TargetIcon && <TargetIcon />}
          rightIcon={<HiChevronDown />}
          variant={"subtle"}
          disabled={props.isDisabled}
          size={"xs"}>
          {props.text}
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        onFocus={(event: FocusEvent) =>
          // Clicking the menu target button moves focus to the dropdown. This is custom Mantine behaviour that can't be
          // prevented by event.preventDefault(), so we have to return focus to the editor manually.
          event.relatedTarget && (event.relatedTarget as HTMLElement).focus()
        }>
        {props.items.map((item) => {
          return (
            <SimpleToolbarDropdownItem
              onClick={item.onClick}
              text={item.text}
              icon={item.icon}
              isSelected={props.text === item.text}
            />
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
