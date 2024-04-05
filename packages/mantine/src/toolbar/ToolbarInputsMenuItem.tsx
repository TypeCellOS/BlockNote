import * as Mantine from "@mantine/core";

import type { IconType } from "react-icons";

export type ToolbarInputsMenuItemProps = {
  icon: IconType;
} & Mantine.TextInputProps;

export const ToolbarInputsMenuItem = (props: ToolbarInputsMenuItemProps) => {
  const { icon, ...rest } = props;
  const Icon = props.icon;

  return (
    <Mantine.Group>
      <Mantine.TextInput leftSection={<Icon />} size={"xs"} {...rest} />
    </Mantine.Group>
  );
};
