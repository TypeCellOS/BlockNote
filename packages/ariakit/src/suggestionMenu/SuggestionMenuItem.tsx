import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, item, isSelected, onClick, id, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={ref}
      id={id}
      onClick={onClick}
      role="option"
      aria-selected={isSelected || undefined}>
      {item.icon && (
        <div
          className="bn-ak-suggestion-menu-item-section"
          data-position="left">
          {item.icon}
        </div>
      )}
      <div className="bn-ak-suggestion-menu-item-body">
        <div className="bn-ak-suggestion-menu-item-title">{item.title}</div>
        <div className="bn-ak-suggestion-menu-item-subtitle">
          {item.subtext}
        </div>
      </div>
      {item.badge && (
        <div
          data-position="right"
          className="bn-ak-suggestion-menu-item-section">
          <div>{item.badge}</div>
        </div>
      )}
    </div>
  );
});
