import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["Button"]
>((props, ref) => {
  const { className, children, onClick } = props;

  return (
    <Mantine.Button
      size={"xs"}
      className={className}
      ref={ref}
      onClick={onClick}>
      {children}
    </Mantine.Button>
  );
});
