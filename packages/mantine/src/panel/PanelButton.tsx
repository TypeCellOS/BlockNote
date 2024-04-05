import * as Mantine from "@mantine/core";

import { PanelButtonProps } from "@blocknote/react";

export const PanelButton = (props: PanelButtonProps) => {
  const { children, ...rest } = props;

  return (
    <Mantine.Button size={"xs"} {...rest}>
      {children}
    </Mantine.Button>
  );
};
