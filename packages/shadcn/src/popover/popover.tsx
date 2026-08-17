import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  PortalContext,
  useBlockNoteEditor,
} from "@blocknote/react";
import { forwardRef, ReactElement, useContext } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"],
) => {
  const {
    children,
    open,
    onOpenChange,
    position: _position, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Popover.Popover open={open} onOpenChange={onOpenChange}>
      {children}
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

  // The DOM node the popover portals into, e.g. the mobile formatting toolbar's
  // non-scrolling wrapper. `null` when there's no such target.
  const portalRoot = useContext(PortalContext);

  // Otherwise default to the editor's portal element (which carries the
  // color-scheme class) so popovers inherit light/dark mode instead of the
  // document body's.
  const editor = useBlockNoteEditor();

  return (
    <ShadCNComponents.Popover.PopoverContent
      sideOffset={8}
      container={portalRoot ?? editor.portalElement}
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
