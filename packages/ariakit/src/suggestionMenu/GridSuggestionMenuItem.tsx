import { assertEmpty } from "@blocknote/core";
import { ComponentProps, elementOverflow, mergeRefs } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

export const GridSuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["GridSuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, isSelected, onClick, item, id, ...rest } = props;

  assertEmpty(rest);

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current || !isSelected) {
      return;
    }

    const overflow = elementOverflow(itemRef.current);

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  return (
    <p
      className={className}
      ref={mergeRefs([ref, itemRef])}
      id={id}
      role="option"
      onClick={onClick}
      // className={index === selectedIndex ? "grid-item-selected" : ""}
      // onClick={() => onItemClick?.(item)}
      aria-selected={isSelected || undefined}>
      {item.icon}
    </p>
  );
});
