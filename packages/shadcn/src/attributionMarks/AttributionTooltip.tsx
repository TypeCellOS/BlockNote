import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";

export const AttributionTooltip = forwardRef<
  HTMLSpanElement,
  ComponentProps["AttributionTooltip"]["Root"]
>((props, ref) => {
  const { className, markClassName, backgroundColor, children, ...rest } =
    props;

  assertEmpty(rest);

  return (
    <span
      className={cn(className, markClassName)}
      style={markClassName ? undefined : { backgroundColor }}
      ref={ref}
    >
      {children}
    </span>
  );
});
