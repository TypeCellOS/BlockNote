import {
  Popover as AriakitPopover,
  PopoverDisclosure as AriakitPopoverDisclosure,
  PopoverProvider as AriakitPopoverProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, PortalContext } from "@blocknote/react";
import { forwardRef, useContext } from "react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Popover"]["Trigger"]
>((props, ref) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <AriakitPopoverDisclosure render={children as any} ref={ref} />;
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children, variant, ...rest } = props;

  assertEmpty(rest);

  // The DOM node the popover portals into, e.g. the mobile formatting toolbar's
  // non-scrolling wrapper. `null` when there's no such target.
  const portalRoot = useContext(PortalContext);

  return (
    <AriakitPopover
      className={mergeCSSClasses(
        "bn-ak-popover",
        className || "",
        variant === "panel-popover" ? "bn-ak-panel-popover" : "",
      )}
      portalElement={portalRoot ?? undefined}
      ref={ref}
    >
      {children}
    </AriakitPopover>
  );
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const { children, open, onOpenChange, position, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitPopoverProvider
      open={open}
      setOpen={onOpenChange}
      placement={position}
    >
      {children}
    </AriakitPopoverProvider>
  );
};
