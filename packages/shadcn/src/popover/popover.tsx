import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const {
    children,
    opened,
    // position
  } = props;

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.Popover open={opened}>
      {children}
    </ShadCNComponents.Popover.Popover>
  );
};

export const PopoverTrigger = forwardRef(
  (props: ComponentProps["Generic"]["Popover"]["Trigger"], ref: any) => {
    const { children } = props;

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
  const { className, children } = props;

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.PopoverContent
      className={cn(className, "gap-2")}
      ref={ref}>
      {children}
    </ShadCNComponents.Popover.PopoverContent>
  );
});
