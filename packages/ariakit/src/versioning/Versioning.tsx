import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <div className={mergeCSSClasses(className)} ref={ref}>
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

  return (
    <div
      className={mergeCSSClasses(
        className,
        selected ? "selected" : "",
        comparing ? "comparing" : "",
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
    </div>
  );
});
