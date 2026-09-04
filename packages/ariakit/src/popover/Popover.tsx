import {
  Popover as AriakitPopover,
  PopoverDisclosure as AriakitPopoverDisclosure,
  PopoverProvider as AriakitPopoverProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { createContext, forwardRef, useContext } from "react";

const PortalElementContext = createContext<HTMLElement | null | undefined>(
  undefined,
);

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

  const portalElement = useContext(PortalElementContext);

  return (
    <AriakitPopover
      className={mergeCSSClasses(
        "bn-ak-popover",
        className || "",
        variant === "panel-popover" ? "bn-ak-panel-popover" : "",
      )}
      portalElement={portalElement ?? undefined}
      ref={ref}
    >
      {children}
    </AriakitPopover>
  );
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const { children, open, onOpenChange, position, portalElement, ...rest } =
    props;

  assertEmpty(rest);

  return (
    <AriakitPopoverProvider
      open={open}
      setOpen={onOpenChange}
      placement={position}
    >
      <PortalElementContext.Provider value={portalElement}>
        {children}
      </PortalElementContext.Provider>
    </AriakitPopoverProvider>
  );
};
