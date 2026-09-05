import {
  Popover as AriakitPopover,
  PopoverDisclosure as AriakitPopoverDisclosure,
  PopoverProvider as AriakitPopoverProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { createContext, forwardRef, useContext } from "react";

// Hands the `portalElement` prop from `Popover` (the root) down to
// `PopoverContent`, where Ariakit takes it.
const PopoverPortalElementContext = createContext<HTMLElement | null>(null);

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

  const portalElement = useContext(PopoverPortalElementContext);

  return (
    <AriakitPopover
      className={mergeCSSClasses(
        "bn-ak-popover",
        className || "",
        variant === "panel-popover" ? "bn-ak-panel-popover" : "",
      )}
      // BlockNote owns focus in its popovers (useAutoFocus, which prevents
      // scrolling). Ariakit's default would bare-focus the first tabbable —
      // in form popovers the very input the hook handles, re-introducing
      // the scroll-yank it exists to avoid. No other skin's library moves
      // focus to an input on open either.
      autoFocusOnShow={false}
      // Ariakit falls back to a body-appended div for a missing element, so
      // don't portal at all until there is one (editor not mounted yet).
      portal={portalElement !== null}
      portalElement={portalElement}
      ref={ref}
    >
      {children}
    </AriakitPopover>
  );
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const {
    children,
    open,
    onOpenChange,
    position,
    portalElement,
    preventFocusOnOpen: _preventFocusOnOpen, // unused; see Menu.tsx
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <AriakitPopoverProvider
      open={open}
      setOpen={onOpenChange}
      placement={position}
    >
      <PopoverPortalElementContext.Provider value={portalElement}>
        {children}
      </PopoverPortalElementContext.Provider>
    </AriakitPopoverProvider>
  );
};
