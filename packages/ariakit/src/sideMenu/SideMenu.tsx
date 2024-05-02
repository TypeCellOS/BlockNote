import * as Ariakit from "@ariakit/react";
import { assertEmpty } from "@blocknote/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SideMenu"]["Root"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.Group className={className} ref={ref}>
      {children}
    </Ariakit.Group>
  );
});
