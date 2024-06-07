import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils";
import { assertEmpty } from "@blocknote/core";

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
        "z-50 min-w-[8rem] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      ref={ref}>
      {children}
    </div>
  );
});
