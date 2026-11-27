import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, elementOverflow, mergeRefs } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLButtonElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, item, isSelected, onClick, id, ...rest } = props;

  assertEmpty(rest);

  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!itemRef.current || !isSelected) {
      return;
    }

    const overflow = elementOverflow(
      itemRef.current,
      itemRef.current.closest(".bn-suggestion-menu, #ai-suggestion-menu")!,
    );

    if (overflow !== "none") {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <button
      type="button"
      tabIndex={-1}
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={mergeRefs([ref, itemRef])}
      id={id}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      role="option"
      aria-selected={isSelected || undefined}
    >
      {item.icon && (
        <span
          className="bn-ak-suggestion-menu-item-section"
          data-position="left"
        >
          {item.icon}
        </span>
      )}
      <span className="bn-ak-suggestion-menu-item-body">
        <span className="bn-ak-suggestion-menu-item-title">{item.title}</span>
        <span className="bn-ak-suggestion-menu-item-subtitle">
          {item.subtext}
        </span>
      </span>
      {item.badge && (
        <span
          data-position="right"
          className="bn-ak-suggestion-menu-item-section"
        >
          <span>{item.badge}</span>
        </span>
      )}
    </button>
  );
});
