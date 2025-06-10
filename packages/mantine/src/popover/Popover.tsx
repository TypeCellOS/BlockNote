import {
  Popover as MantinePopover,
  PopoverDropdown as MantinePopoverDropdown,
  PopoverTarget as MantinePopoverTarget,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const { opened, position, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantinePopover withinPortal={false} opened={opened} position={position}>
      {children}
    </MantinePopover>
  );
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"],
) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <MantinePopoverTarget>{children}</MantinePopoverTarget>;
};

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const {
    className,
    children,
    variant, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <MantinePopoverDropdown className={className} ref={ref}>
      {children}
    </MantinePopoverDropdown>
  );
});
