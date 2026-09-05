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
  const {
    open,
    onOpenChange,
    position,
    portalElement,
    preventFocusOnOpen,
    children,
    ...rest
  } = props;

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
      // Keep the dropdown visible through virtual-keyboard viewport resizes on
      // mobile: hideDetached (default true) reacts to the resize by setting
      // display:none on the dropdown, which blurs its focused input and
      // dismisses the on-screen keyboard (the input then unmounts with the
      // toolbar, so the whole UI collapses). `preventFocusOnOpen` is set for
      // exactly the popovers that live in the mobile toolbar.
      hideDetached={preventFocusOnOpen ? false : undefined}
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
