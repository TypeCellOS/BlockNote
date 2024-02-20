import {
  FileInput,
  FileInputProps,
  Group,
  TextInput,
  TextInputProps,
} from "@mantine/core";
import { ForwardedRef, forwardRef } from "react";
import type { IconType } from "react-icons";

export type InputType = "text" | "file";

export type InputProps = {
  text: TextInputProps;
  file: FileInputProps;
};

export const inputComponents: Record<InputType, any> = {
  text: TextInput,
  file: FileInput,
};

export type ToolbarInputDropdownItemProps<Type extends InputType> = {
  type: Type;
  inputProps: Omit<InputProps[Type], "type">;
  icon: IconType;
};

export const Component = <Type extends InputType>(
  props: ToolbarInputDropdownItemProps<Type>,
  ref: ForwardedRef<Type extends "text" ? HTMLInputElement : HTMLButtonElement>
) => {
  const Icon = props.icon;
  const Input = inputComponents[props.type];

  return (
    <Group>
      <Input size={"xs"} icon={<Icon />} ref={ref} {...props.inputProps} />
    </Group>
  );
};

export const ToolbarInputDropdownItem = forwardRef(Component) as <
  Type extends InputType
>(
  props: ToolbarInputDropdownItemProps<Type> & {
    ref?: ForwardedRef<
      Type extends "text" ? HTMLInputElement : HTMLButtonElement
    >;
  }
) => ReturnType<typeof Component>;
