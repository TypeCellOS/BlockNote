import { IconType } from "react-icons/lib";
import { TiTick } from "react-icons/ti";
import {ComponentPropsWithoutRef, forwardRef} from "react";
import {Group, Text} from "@mantine/core";

export interface TextTypeDropdownItemProps extends ComponentPropsWithoutRef<'div'> {
  value: string;
  label: string;
  icon: IconType;
  isSelected: boolean;
}

export const TextTypeDropdownItem = forwardRef<HTMLDivElement, TextTypeDropdownItemProps>(
  ({label, icon, isSelected, ...otherProps}: TextTypeDropdownItemProps, ref) => {
  const ButtonIcon = icon
  return (
    <div ref={ref} {...otherProps}>
      <Group>
        <ButtonIcon/>
        <div>
          <Text size={"xs"}>{label}</Text>
        </div>
        {isSelected && <TiTick />}
      </Group>
    </div>
  );
});
