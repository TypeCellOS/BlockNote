import * as ShadCNPopover from "../components/ui/popover";

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

  const ShadCNComponents = useShadCNComponentsContext();
  const Popover = ShadCNComponents?.Popover || ShadCNPopover.Popover;

  return <Popover open={opened}>{children}</Popover>;
};

export const PopoverTrigger = forwardRef(
  (
    props: ComponentProps["Generic"]["Popover"]["Trigger"] &
      Partial<{ PopoverTrigger: typeof ShadCNPopover.PopoverTrigger }>,
    ref: any
  ) => {
    const { children } = props;

    const ShadCNComponents = useShadCNComponentsContext();
    const PopoverTrigger =
      ShadCNComponents?.PopoverTrigger || ShadCNPopover.PopoverTrigger;

    return (
      <PopoverTrigger ref={ref} asChild={true}>
        {children}
      </PopoverTrigger>
    );
  }
);

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const PopoverContent =
    ShadCNComponents?.PopoverContent || ShadCNPopover.PopoverContent;

  return (
    <PopoverContent className={cn(className, "gap-2")} ref={ref}>
      {children}
    </PopoverContent>
  );
});
