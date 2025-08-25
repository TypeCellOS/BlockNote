import { assertEmpty } from "@blocknote/core";
import { ComponentProps, elementOverflow, mergeRefs } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const ShadCNComponents = useShadCNComponentsContext()!;

  const { className, item, isSelected, onClick, id, ...rest } = props;

  assertEmpty(rest);

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current || !isSelected) {
      return;
    }

    const overflow = elementOverflow(
      itemRef.current,
      document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")!, // TODO
    );
    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  return (
    <div
      // Styles from ShadCN DropdownMenuItem component
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:data-[variant=destructive]:text-destructive bn:data-[variant=destructive]:focus:bg-destructive/10 bn:dark:data-[variant=destructive]:focus:bg-destructive/20 bn:data-[variant=destructive]:focus:text-destructive bn:data-[variant=destructive]:*:[svg]:!text-destructive bn:[&_svg:not([class*=text-])]:text-muted-foreground bn:relative bn:flex bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:px-2 bn:py-1.5 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:data-[inset]:pl-8 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        "bn:hover:bg-accent bn:hover:text-accent-foreground bn:data-[variant=destructive]:hover:bg-destructive/10 bn:dark:data-[variant=destructive]:hover:bg-destructive/20 bn:data-[variant=destructive]:hover:text-destructive",
        "bn:aria-selected:bg-accent bn:aria-selected:text-accent-foreground bn:data-[variant=destructive]:aria-selected:bg-destructive/10 bn:dark:data-[variant=destructive]:aria-selected:bg-destructive/20 bn:data-[variant=destructive]:aria-selected:text-destructive",
        props.item.size === "small" ? "bn:gap-3 bn:py-1" : "",
        className,
      )}
      data-highlighted
      ref={mergeRefs([ref, itemRef])}
      id={id}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      role="option"
      aria-selected={isSelected || undefined}
    >
      {item.icon && (
        <div
          className={cn(
            "bn:p-3",
            props.item.size === "small" ? "bn:p-0" : "",
            className,
          )}
          data-position="left"
        >
          {item.icon}
        </div>
      )}
      <div className="bn:flex-1">
        <div
          className={cn(
            "bn:text-base",
            props.item.size === "small" ? "bn:text-sm" : "",
            className,
          )}
        >
          {item.title}
        </div>
        <div
          className={cn(
            "bn:text-xs",
            props.item.size === "small" ? "bn:hidden" : "",
            className,
          )}
        >
          {item.subtext}
        </div>
      </div>
      {item.badge && (
        <div data-position="right" className="bn:text-xs">
          <ShadCNComponents.Badge.Badge variant={"secondary"}>
            {item.badge}
          </ShadCNComponents.Badge.Badge>
        </div>
      )}
    </div>
  );
});
