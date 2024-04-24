import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuEmptyItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["EmptyItem"]
>((props, ref) => {
  const { className } = props;

  return (
    <div
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={ref}>
      <div className="bn-ak-suggestion-menu-item-label">No items found</div>
    </div>
  );
});
