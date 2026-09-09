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
      // BlockNote owns focus (`useAutoFocus` on the input), so Ariakit's own
      // autofocus stays off. That hook runs at mount, and Ariakit keeps
      // popover content mounted while closed: without `unmountOnHide` it ran
      // once, on the hidden input, and the URL input was never focused.
      autoFocusOnShow={false}
      // How-to-test: without it, the link form's URL input never gets focus, desktop and mobile alike: Ariakit keeps the closed popover's content mounted, so the input's `useAutoFocus` fired once, hidden, when the toolbar mounted, and never again on open (covered by skinFocus, android, ariakit: "the link button hands focus to the URL input", and linkToolbar, chromium, ariakit: "Create link").
      unmountOnHide={true}
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
  const { children, open, onOpenChange, position, portalElement, ...rest } =
    props;

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
