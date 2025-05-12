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
        "bn-w-[300px]",
        selected ? "bn-bg-accent bn-text-accent-foreground" : "",
      )}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      ref={ref}
    >
      {headerText && (
        <div className={"bn-px-4 bn-pt-4 bn-italic bn-text-sm"}>
          {headerText}
        </div>
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
        "bn-p-4",
        className?.includes("bn-thread-comments")
          ? "bn-flex bn-flex-col bn-gap-6 bn-border-b"
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
        "bn-p-0 bn-w-fit bn-text-foreground bn-bg-transparent hover:bn-bg-transparent",
      )}
      ref={ref}
    >
      {children}
    </ShadCNComponents.Button.Button>
  );
});
