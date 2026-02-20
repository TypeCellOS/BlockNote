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
      itemRef.current.closest(".bn-grid-suggestion-menu")!,
    );

    
    if (overflow !== "none") {
      itemRef.current.scrollIntoView({ block: "nearest" });
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
