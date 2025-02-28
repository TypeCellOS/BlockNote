import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Card.Card
      className={cn(className, "bn-w-[300px]")}
      ref={ref}>
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
          : ""
      )}
      ref={ref}>
      {children}
    </div>
  );
});
