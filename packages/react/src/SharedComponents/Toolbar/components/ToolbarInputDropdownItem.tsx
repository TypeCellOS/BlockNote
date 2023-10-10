import {
  FileInput,
  FileInputProps,
  Group,
  TextInput,
  TextInputProps,
} from "@mantine/core";
import { IconType } from "react-icons";

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

export const ToolbarInputDropdownItem = <Type extends InputType>(
  props: ToolbarInputDropdownItemProps<Type>
) => {
  const Icon = props.icon;
  const Input = inputComponents[props.type];

  return (
    <Group>
      <Input size={"xs"} icon={<Icon />} {...props.inputProps} />
    </Group>
  );
};
