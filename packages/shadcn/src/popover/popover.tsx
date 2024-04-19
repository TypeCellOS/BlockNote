import * as ShadCNPopover from "../components/ui/popover";

import { ComponentProps } from "@blocknote/react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"] &
    Partial<{ Popover: typeof ShadCNPopover.Popover }>
) => {
  const {
    children,
    opened,
    // position
  } = props;

  const Popover = props.Popover || ShadCNPopover.Popover;

  return <Popover open={opened}>{children}</Popover>;
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"] &
    Partial<{ PopoverTrigger: typeof ShadCNPopover.PopoverTrigger }>
) => {
  const { children } = props;

  const PopoverTrigger = props.PopoverTrigger || ShadCNPopover.PopoverTrigger;

  return <PopoverTrigger>{children}</PopoverTrigger>;
};

export const PopoverContent = (
  props: ComponentProps["Generic"]["Popover"]["Content"] &
    Partial<{ PopoverContent: typeof ShadCNPopover.PopoverContent }>
) => {
  const { className, children } = props;

  const PopoverContent = props.PopoverContent || ShadCNPopover.PopoverContent;

  return <PopoverContent className={className}>{children}</PopoverContent>;
};
