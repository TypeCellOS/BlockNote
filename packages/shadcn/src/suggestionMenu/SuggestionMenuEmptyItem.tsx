import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { cn } from "../lib/utils";

export const SuggestionMenuEmptyItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["EmptyItem"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      // Styles from ShadCN DropdownMenuItem component
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      ref={ref}>
      <div>{children}</div>
    </div>
  );
});
