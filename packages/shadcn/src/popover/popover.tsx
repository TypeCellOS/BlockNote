import * as ShadCNPopover from "../components/ui/popover";
import { ComponentProps } from "@blocknote/react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"] &
    Partial<{ Popover: typeof ShadCNPopover.Popover }>
) => {
  const { children, ...rest } = props;

  const Popover = props.Popover || ShadCNPopover.Popover;

  return <Popover {...rest}>{children}</Popover>;
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"] &
    Partial<{ PopoverTrigger: typeof ShadCNPopover.PopoverTrigger }>
) => {
  const { children, ...rest } = props;

  const PopoverTrigger = props.PopoverTrigger || ShadCNPopover.PopoverTrigger;

  return <PopoverTrigger {...rest}>{children}</PopoverTrigger>;
};

export const PopoverContent = (
  props: ComponentProps["Generic"]["Popover"]["Content"] &
    Partial<{ PopoverContent: typeof ShadCNPopover.PopoverContent }>
) => {
  const { children, ...rest } = props;

  const PopoverContent = props.PopoverContent || ShadCNPopover.PopoverContent;

  return <PopoverContent {...rest}>{children}</PopoverContent>;
};
