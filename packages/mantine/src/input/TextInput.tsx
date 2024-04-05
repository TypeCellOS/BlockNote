import * as Mantine from "@mantine/core";

import { TextInputProps } from "@blocknote/react";

export const TextInput = (props: TextInputProps) => {
  const { icon, ...rest } = props;
  return <Mantine.TextInput leftSection={icon} size={"xs"} {...rest} />;
};
