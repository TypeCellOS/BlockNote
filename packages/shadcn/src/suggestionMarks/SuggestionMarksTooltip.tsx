import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

export const SuggestionMarksTooltip = (
  props: ComponentProps["SuggestionMarksTooltip"]["Root"],
) => {
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
