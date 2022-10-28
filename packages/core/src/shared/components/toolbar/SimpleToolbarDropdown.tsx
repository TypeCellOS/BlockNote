import { Button, Menu } from "@mantine/core";
import {
  SimpleToolbarDropdownItem,
  SimpleToolbarDropdownItemProps,
} from "./SimpleToolbarDropdownItem";
import { HiChevronDown } from "react-icons/hi";
import { IconType } from "react-icons";

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
    <Menu exitTransitionDuration={0}>
      <Menu.Target>
        <Button
          leftIcon={TargetIcon && <TargetIcon />}
          rightIcon={<HiChevronDown />}
          size={"xs"}
          variant={"subtle"}
          disabled={props.isDisabled}>
          {props.text}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {props.items.map((item) => {
          return (
            <SimpleToolbarDropdownItem
              key={item.text}
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
