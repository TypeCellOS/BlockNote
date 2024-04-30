import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SideMenu"]["Root"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Mantine.Group align={"center"} gap={0} className={className} ref={ref}>
      {children}
    </Mantine.Group>
  );
});
