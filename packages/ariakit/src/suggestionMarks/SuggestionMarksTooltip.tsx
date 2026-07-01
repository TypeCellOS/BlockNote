import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

type SuggestionMarksTooltipProps =
  ComponentProps["SuggestionMarksTooltip"]["Root"];

export const SuggestionMarksTooltip = (props: SuggestionMarksTooltipProps) => {
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
