import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"]
) => {
  const { icon, ...rest } = props;
  return <Mantine.TextInput leftSection={icon} size={"xs"} {...rest} />;
};
