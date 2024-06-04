import {
  Popover as MantinePopover,
  PopoverTarget,
  PopoverDropdown,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { children, opened, position, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantinePopover
      withinPortal={false}
      zIndex={10000}
      opened={opened}
      position={position}>
      {children}
    </MantinePopover>
  );
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <PopoverTarget>{children}</PopoverTarget>;
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
    <PopoverDropdown className={className} ref={ref}>
      {children}
    </PopoverDropdown>
  );
});
