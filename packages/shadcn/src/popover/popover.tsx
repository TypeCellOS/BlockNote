import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

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
        "flex flex-col gap-2",
        variant === "panel-popover"
          ? "p-0 border-none shadow-none max-w-none w-fit"
          : ""
      )}
      ref={ref}>
      {children}
    </ShadCNComponents.Popover.PopoverContent>
  );
});
