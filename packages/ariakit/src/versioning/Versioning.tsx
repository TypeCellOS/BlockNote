import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, "aria-label": ariaLabel, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <div
      className={mergeCSSClasses(className)}
      ref={ref}
      role="region"
      aria-label={ariaLabel}
    >
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
    id,
    "aria-label": ariaLabel,
    selected,
    comparing,
    tabIndex,
    "aria-busy": ariaBusy,
    onClick,
    onKeyDown,
    onFocus,
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
      id={id}
      role="listitem"
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
      aria-busy={ariaBusy}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      ref={ref}
    >
      {children}
      {actions && (
        // Isolate the actions area so clicks on the menu (trigger and items,
        // which render inline rather than in a portal) don't bubble to the
        // row's select handler, and so its own keyboard handling isn't eaten
        // by the list's arrow-key navigation.
        <div
          className={"bn-snapshot-menu"}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
});
