import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { createContext, forwardRef, ReactElement, useContext } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

// Hands the `portalElement` prop from `Popover` (the root) down to
// `PopoverContent`, where the content's `container` is set.
const PopoverPortalElementContext = createContext<HTMLElement | null>(null);

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const {
    children,
    open,
    onOpenChange,
    position: _position, // unused
    portalElement,
    // base-ui manages popover focus itself; unlike Mantine there is no focus to
    // suppress, so this is intentionally unused.
    preventFocusOnOpen: _preventFocusOnOpen,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.Popover open={open} onOpenChange={onOpenChange}>
      <PopoverPortalElementContext.Provider value={portalElement}>
        {children}
      </PopoverPortalElementContext.Provider>
    </ShadCNComponents.Popover.Popover>
  );
};

export const PopoverTrigger = forwardRef(
  (props: ComponentProps["Generic"]["Popover"]["Trigger"], ref: any) => {
    const { children, ...rest } = props;

    assertEmpty(rest);

    const ShadCNComponents = useShadCNComponentsContext()!;

    return (
      <ShadCNComponents.Popover.PopoverTrigger
        ref={ref}
        render={children as ReactElement}
      />
    );
  },
);

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, variant, children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  // The `portalElement` supplied at the call site is a themed `.bn-root`, so
  // popovers inherit light/dark mode instead of the document body's, and escape
  // the mobile formatting toolbar's horizontal scroll clip.
  // `null` (editor not mounted yet) makes Base UI wait for a container
  // instead of falling back to the body; nothing is open at that point.
  const container = useContext(PopoverPortalElementContext);

  return (
    <ShadCNComponents.Popover.PopoverContent
      sideOffset={8}
      container={container}
      className={cn(
        className,
        "flex flex-col gap-2",
        variant === "panel-popover"
          ? "w-fit max-w-none border-none p-0 shadow-none"
          : "",
      )}
      ref={ref}
    >
      {children}
    </ShadCNComponents.Popover.PopoverContent>
  );
});
