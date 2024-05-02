import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef, useCallback } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, item, isSelected, setSelected, onClick, ...rest } = props;

  assertEmpty(rest);

  const handleMouseLeave = useCallback(() => {
    setSelected?.(false);
  }, [setSelected]);

  const handleMouseEnter = useCallback(() => {
    setSelected?.(true);
  }, [setSelected]);

  return (
    <div
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={ref}
      onClick={onClick}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={isSelected ? "" : undefined}>
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
