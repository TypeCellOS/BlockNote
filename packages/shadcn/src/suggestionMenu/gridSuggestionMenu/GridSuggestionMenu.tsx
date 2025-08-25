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
        "bn:bg-popover bn:text-popover-foreground bn:data-[state=open]:animate-in bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=open]:fade-in-0 bn:data-[state=closed]:zoom-out-95 bn:data-[state=open]:zoom-in-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:z-50 bn:max-h-(--radix-dropdown-menu-content-available-height) bn:min-w-[8rem] bn:origin-(--radix-dropdown-menu-content-transform-origin) bn:overflow-x-hidden bn:overflow-y-auto bn:rounded-md bn:border bn:p-1 bn:shadow-md",
        "bn:grid",
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
