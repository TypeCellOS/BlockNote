import { mergeCSSClasses } from "@blocknote/core";

import {
  type ComponentProps,
  useComponentsContext,
} from "../../../editor/ComponentsContext.js";

/** Availability and behavior of a version action, independent of its UI. */
export type VersionMenuAction =
  | { available: false }
  | { available: true; execute: () => void | Promise<void> };

export type VersionMenuItemProps = Omit<
  ComponentProps["Generic"]["Menu"]["Item"],
  "subTrigger"
>;

/** Presentation overrides; use the corresponding action hook to customize behavior. */
export type DefaultVersionMenuItemProps = Omit<VersionMenuItemProps, "onClick">;

/**
 * A single item in a version row's "..." menu. Use it for application-specific
 * actions; the row it belongs to is available via `useVersionSnapshot()`.
 */
export function VersionMenuItem(props: VersionMenuItemProps) {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Item
      {...props}
      className={mergeCSSClasses("bn-menu-item", props.className)}
    />
  );
}
