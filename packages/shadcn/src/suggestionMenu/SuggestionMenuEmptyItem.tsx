import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";

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
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:data-[variant=destructive]:text-destructive bn:data-[variant=destructive]:focus:bg-destructive/10 bn:dark:data-[variant=destructive]:focus:bg-destructive/20 bn:data-[variant=destructive]:focus:text-destructive bn:data-[variant=destructive]:*:[svg]:!text-destructive bn:[&_svg:not([class*=text-])]:text-muted-foreground bn:relative bn:flex bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:px-2 bn:py-1.5 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:data-[inset]:pl-8 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        "bn:hover:bg-accent bn:hover:text-accent-foreground bn:data-[variant=destructive]:hover:bg-destructive/10 bn:dark:data-[variant=destructive]:hover:bg-destructive/20 bn:data-[variant=destructive]:hover:text-destructive",
        "bn:aria-selected:bg-accent bn:aria-selected:text-accent-foreground bn:data-[variant=destructive]:aria-selected:bg-destructive/10 bn:dark:data-[variant=destructive]:aria-selected:bg-destructive/20 bn:data-[variant=destructive]:aria-selected:text-destructive",
        className,
      )}
      ref={ref}
    >
      <div>{children}</div>
    </div>
  );
});
