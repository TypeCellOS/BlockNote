import * as Mantine from "@mantine/core";

import { mergeCSSClasses } from "@blocknote/core";
import { forwardRef, HTMLAttributes } from "react";

export const Toolbar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Mantine.Group
      className={mergeCSSClasses("bn-toolbar", className || "")}
      ref={ref}
      {...rest}>
      {children}
    </Mantine.Group>
  );
});
