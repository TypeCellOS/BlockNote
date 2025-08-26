import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const {
    className,
    children,
    selected,
    headerText,
    onFocus,
    onBlur,
    tabIndex,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Card.Card
      className={cn(
        className,
        "w-[300px]",
        selected ? "bg-accent text-accent-foreground" : "",
      )}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      ref={ref}
    >
      {headerText && (
        <div className={"px-4 pt-4 text-sm italic"}>{headerText}</div>
      )}
      {children}
    </ShadCNComponents.Card.Card>
  );
});

export const CardSection = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["CardSection"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      className={cn(
        className,
        "p-4",
        className?.includes("thread-comments")
          ? "flex flex-col gap-6 border-b"
          : "",
      )}
      ref={ref}
    >
      {children}
    </div>
  );
});

export const ExpandSectionsPrompt = forwardRef<
  HTMLButtonElement,
  ComponentProps["Comments"]["ExpandSectionsPrompt"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Button.Button
      className={cn(
        className,
        "text-foreground w-fit bg-transparent p-0 hover:bg-transparent",
      )}
      ref={ref}
    >
      {children}
    </ShadCNComponents.Button.Button>
  );
});
