import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const AttributionTooltip = forwardRef<
  HTMLSpanElement,
  ComponentProps["AttributionTooltip"]["Root"]
>((props, ref) => {
  const { className, markClassName, backgroundColor, children, ...rest } =
    props;

  assertEmpty(rest);

  return (
    <span
      className={mergeCSSClasses(className || "", markClassName || "")}
      style={markClassName ? undefined : { backgroundColor }}
      ref={ref}
    >
      {children}
    </span>
  );
});
