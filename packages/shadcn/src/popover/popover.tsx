import { assertEmpty } from "@blocknote/core";
import { ComponentProps, usePortalElement } from "@blocknote/react";
import { createContext, forwardRef, ReactElement, useContext } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

const PortalElementContext = createContext<HTMLElement | null | undefined>(
  undefined,
);

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const {
    children,
    open,
    onOpenChange,
    position: _position, // unused
    portalElement,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.Popover open={open} onOpenChange={onOpenChange}>
      <PortalElementContext.Provider value={portalElement}>
        {children}
      </PortalElementContext.Provider>
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

  const portalElement = useContext(PortalElementContext);
  // Default to the ambient portal target (a themed `.bn-root`) so popovers
  // inherit light/dark mode instead of the document body's, and escape the
  // mobile formatting toolbar's horizontal scroll clip.
  const ambientPortalElement = usePortalElement();

  return (
    <ShadCNComponents.Popover.PopoverContent
      sideOffset={8}
      container={portalElement ?? ambientPortalElement ?? undefined}
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
