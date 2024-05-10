import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      className={mergeCSSClasses("bn-ak-group-label", className || "")}
      ref={ref}>
      {children}
    </div>
  );
});
