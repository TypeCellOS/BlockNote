import { assertEmpty } from "@blocknote/core";
import { ComponentProps, elementOverflow, mergeRefs } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

import { cn } from "../../lib/utils.js";

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
      // Styles from ShadCN DropdownMenuItem component
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=text-])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "hover:bg-accent hover:text-accent-foreground data-[variant=destructive]:hover:bg-destructive/10 dark:data-[variant=destructive]:hover:bg-destructive/20 data-[variant=destructive]:hover:text-destructive",
        "aria-selected:bg-accent aria-selected:text-accent-foreground data-[variant=destructive]:aria-selected:bg-destructive/10 dark:data-[variant=destructive]:aria-selected:bg-destructive/20 data-[variant=destructive]:aria-selected:text-destructive",
        "text-lg!",
        className,
      )}
      ref={mergeRefs([ref, itemRef])}
      id={id}
      role="option"
      onClick={onClick}
      aria-selected={isSelected || undefined}
    >
      {item.icon}
    </div>
  );
});
