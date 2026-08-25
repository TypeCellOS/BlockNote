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
  const { open, onOpenChange, position, portalRoot, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantinePopover
      middlewares={{ size: { padding: 20 } }}
      // On mobile (signalled by `portalRoot` being set) the dropdown lives
      // inside the toolbar's horizontal scroll container, which would clip it.
      withinPortal={!!portalRoot}
      portalProps={portalRoot ? { target: portalRoot } : undefined}
      // Do not move focus to the dropdown on mobile, as it blurs the editor's
      // contentEditable and dismisses the on-screen keyboard.
      trapFocus={portalRoot ? false : undefined}
      opened={open}
      onChange={onOpenChange}
      position={position}
    >
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
    variant: _variant, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <MantinePopoverDropdown className={className} ref={ref}>
      {children}
    </MantinePopoverDropdown>
  );
});
