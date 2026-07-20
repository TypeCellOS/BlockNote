import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <div className={cn(className)} ref={ref}>
      {children}
    </div>
  );
});

export const Snapshot = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Snapshot"]
>((props, ref) => {
  const {
    className,
    selected,
    comparing,
    onClick,
    actions,
    children,
    ...rest
  } = props;

  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Card.Card
      // `bn-snapshot` (and the `selected`/`comparing` state classes) carry the
      // shared sidebar CSS, which also styles this row's children — so they're
      // kept and Tailwind is merged alongside, as in `Comments/Card`. The
      // utilities below only neutralize `Card`'s own defaults (`gap-6`,
      // `rounded-xl`, `py-6`, `shadow-sm`) where they'd fight that CSS.
      className={cn(
        className,
        selected ? "selected" : "",
        comparing ? "comparing" : "",
        "gap-0 rounded-lg py-0 shadow-none",
      )}
      onClick={onClick}
      ref={ref}
    >
      {children}
      {actions && (
        // Isolate the actions area so clicks on the menu (trigger and items,
        // which render inline rather than in a portal) don't bubble to the
        // row's select handler.
        <div
          className={"bn-snapshot-menu"}
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </ShadCNComponents.Card.Card>
  );
});
