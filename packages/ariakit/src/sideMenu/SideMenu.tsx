import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SideMenu"]["Root"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Ariakit.Group className={className} ref={ref}>
      {children}
    </Ariakit.Group>
  );
});
