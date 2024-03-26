import { Group, TextInput, TextInputProps } from "@mantine/core";
import type { IconType } from "react-icons";

export type ToolbarInputsMenuItemProps = {
  icon: IconType;
} & TextInputProps;

export const ToolbarInputsMenuItem = (props: ToolbarInputsMenuItemProps) => {
  const { icon, ...rest } = props;
  const Icon = props.icon;

  return (
    <Group>
      <TextInput leftSection={<Icon />} size={"xs"} {...rest} />
    </Group>
  );
};
