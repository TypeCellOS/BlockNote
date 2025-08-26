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
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md",
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
