import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["Button"]
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <Mantine.Button size={"xs"} ref={ref} {...rest}>
      {children}
    </Mantine.Button>
  );
});
