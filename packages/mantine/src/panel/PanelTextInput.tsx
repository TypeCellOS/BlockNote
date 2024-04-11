import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  return <Mantine.TextInput size={"xs"} {...props} data-test={"embed-input"} />;
};
