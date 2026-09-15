import { ReactNode } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";

/**
 * A single item in a version row's "..." menu. Use it for application-specific
 * actions; the row it belongs to is available via `useVersionSnapshot()`.
 */
export function VersionMenuItem(props: {
  className?: string;
  icon?: ReactNode;
  checked?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Item
      className={props.className ?? "bn-menu-item"}
      icon={props.icon}
      checked={props.checked}
      onClick={props.onClick}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}
