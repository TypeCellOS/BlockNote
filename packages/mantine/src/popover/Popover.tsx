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
  const { open, onOpenChange, position, portalElement, children, ...rest } =
    props;

  assertEmpty(rest);

  return (
    <MantinePopover
      middlewares={{ size: { padding: 20 } }}
      withinPortal={!!portalElement}
      portalProps={portalElement ? { target: portalElement } : undefined}
      // Pins Mantine's default: a trap would move focus into the dropdown,
      // which on mobile blurs the contentEditable and dismisses the
      // keyboard. BlockNote owns focus in its popovers (useAutoFocus).
      trapFocus={false}
      // Mantine would hide the dropdown (`display: none`) whenever it judges
      // the target out of view. BlockNote's floating UI already hides itself,
      // dropdowns included, when its reference leaves the viewport, and on
      // mobile the on-screen keyboard's viewport resize makes Mantine judge
      // the toolbar button out of view for a moment: the hidden dropdown
      // blurs its focused input and the keyboard closes. How to test: without
      // this line, tapping the link button on the mobile toolbar hides the
      // keyboard and the toolbar (Android).
      hideDetached={false}
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
