import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

type AttributionTooltipProps = ComponentProps["AttributionTooltip"]["Root"];

export const AttributionTooltip = (props: AttributionTooltipProps) => {
  const { className, markClassName, backgroundColor, children, ...rest } =
    props;

  assertEmpty(rest);

  return (
    <span
      className={mergeCSSClasses(className || "", markClassName || "")}
      style={markClassName ? undefined : { backgroundColor }}
    >
      {children}
    </span>
  );
};
