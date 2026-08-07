import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { cn } from "../lib/utils.js";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, id, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      id={id}
      role="listbox"
      // Styles from ShadCN DropdownMenuContent component
      className={cn(
        "bg-popover text-popover-foreground z-50 min-w-32 overflow-x-hidden overflow-y-auto rounded-md p-1 shadow-md ring-1 ring-foreground/10",
        className,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
});
