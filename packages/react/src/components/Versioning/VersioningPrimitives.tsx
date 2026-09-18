import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import type { ComponentProps } from "../../editor/ComponentsContext.js";
import {
  forwardRef,
  type ComponentType,
  type ComponentPropsWithRef,
} from "react";

export const VersioningSidebarRoot = forwardRef<
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

export const VersioningSnapshotRow = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Snapshot"] & {
    as?: "div" | ComponentType<ComponentPropsWithRef<"div">>;
  }
>((props, ref) => {
  const {
    className,
    id,
    "aria-label": ariaLabel,
    as: Root = "div",
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
    <Root
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
        // Keep menu interactions out of row selection and keyboard navigation.
        <div
          className={"bn-snapshot-menu"}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </Root>
  );
});
