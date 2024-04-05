import * as Mantine from "@mantine/core";

import { PanelTextInputProps } from "@blocknote/react";

export const PanelTextInput = (props: PanelTextInputProps) => {
  const { children, ...rest } = props;

  return <Mantine.TextInput size={"xs"} {...rest} data-test={"embed-input"} />;
};
