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

  // A `portalRoot` is only passed by the mobile toolbar, which renders its
  // popovers into its own container — so it doubles as "this popover belongs
  // to the mobile toolbar", which is what the two behaviours below actually
  // depend on. Named here so the reason isn't hidden behind an unrelated prop.
  // TODO: clean this up once we've settled on a proper portalling solution
  // (pending discussion) — inferring mobile-ness from `portalRoot` should
  // become an explicit signal.
  const isMobileToolbarPopover = !!portalRoot;

  assertEmpty(rest);

  return (
    <MantinePopover
      middlewares={{ size: { padding: 20 } }}
      withinPortal={!!portalRoot}
      portalProps={portalRoot ? { target: portalRoot } : undefined}
      // Do not move focus to the dropdown on mobile, as it blurs the editor's
      // contentEditable and dismisses the on-screen keyboard.
      trapFocus={isMobileToolbarPopover ? false : undefined}
      // Keep the dropdown visible through virtual-keyboard viewport resizes on
      // mobile: hideDetached (default true) reacts to the resize by setting
      // display:none on the dropdown, which blurs its focused input and
      // dismisses the on-screen keyboard (the input then unmounts with the
      // toolbar, so the whole UI collapses).
      hideDetached={isMobileToolbarPopover ? false : undefined}
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
