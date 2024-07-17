import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const {
    children,
    opened,
    position, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.Popover open={opened}>
      {children}
    </ShadCNComponents.Popover.Popover>
  );
};

export const PopoverTrigger = forwardRef(
  (props: ComponentProps["Generic"]["Popover"]["Trigger"], ref: any) => {
    const { children, ...rest } = props;

    assertEmpty(rest);

    const ShadCNComponents = useShadCNComponentsContext()!;

    return (
      <ShadCNComponents.Popover.PopoverTrigger ref={ref} asChild={true}>
        {children}
      </ShadCNComponents.Popover.PopoverTrigger>
    );
  }
);

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, variant, children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.PopoverContent
      sideOffset={8}
      className={cn(
        className,
        "bn-flex bn-flex-col bn-gap-2",
        variant === "panel-popover"
          ? "bn-p-0 bn-border-none bn-shadow-none bn-max-w-none bn-w-fit"
          : ""
      )}
      ref={ref}>
      {children}
    </ShadCNComponents.Popover.PopoverContent>
  );
});
