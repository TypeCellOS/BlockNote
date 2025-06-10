import { mergeRefs } from "@mantine/hooks";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, elementOverflow } from "@blocknote/react";
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

    const overflow = elementOverflow(
      itemRef.current,
      document.querySelector(".bn-grid-suggestion-menu")!,
    );

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  return (
    <div
      className={className}
      ref={mergeRefs(ref, itemRef)}
      id={id}
      role="option"
      onClick={onClick}
      aria-selected={isSelected || undefined}
    >
      {item.icon}
    </div>
  );
});
