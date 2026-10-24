import { assertEmpty } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export function Root(props: ComponentProps["TableOfContents"]["Root"]) {
  const { className, title, children, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <nav className={className} aria-label={title}>
      <p className="text-muted-foreground m-0 mb-2 ps-3 text-xs font-medium">
        {title}
      </p>
      {children}
    </nav>
  );
}

export function Item(props: ComponentProps["TableOfContents"]["Item"]) {
  const {
    className,
    depth,
    isActive,
    onClick,
    children,
    ...rest
  } = props;
  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Button.Button
      variant="ghost"
      size="sm"
      // Color only: a bolder active entry could rewrap and move the ones
      // below.
      className={cn(
        className,
        "h-auto w-full justify-start py-1 pe-2 text-start font-normal whitespace-normal",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      style={{ paddingInlineStart: 12 + depth * 12 }}
      aria-current={isActive ? "location" : undefined}
      onClick={onClick}
    >
      {children}
    </ShadCNComponents.Button.Button>
  );
}
