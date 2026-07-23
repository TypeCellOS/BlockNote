import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../../lib/utils.js";

export const GridSuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["GridSuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, id, columns, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      // Styles from ShadCN DropdownMenuContent component
      className={cn(
        "bg-popover text-popover-foreground z-50 min-w-32 overflow-x-hidden overflow-y-auto rounded-md p-1 shadow-md ring-1 ring-foreground/10",
        "grid",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as any}
      ref={ref}
      id={id}
      role="grid"
    >
      {children}
    </div>
  );
});
