import * as ShadCNPopover from "../components/ui/popover";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

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

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"] &
    Partial<{ PopoverTrigger: typeof ShadCNPopover.PopoverTrigger }>
) => {
  const { children } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const PopoverTrigger =
    ShadCNComponents?.PopoverTrigger || ShadCNPopover.PopoverTrigger;

  return <PopoverTrigger>{children}</PopoverTrigger>;
};

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const PopoverContent =
    ShadCNComponents?.PopoverContent || ShadCNPopover.PopoverContent;

  return (
    <PopoverContent className={className} ref={ref}>
      {children}
    </PopoverContent>
  );
});
