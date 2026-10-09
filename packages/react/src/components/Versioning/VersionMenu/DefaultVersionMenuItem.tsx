import type { ReactNode } from "react";
import {
  VersionMenuItem,
  type DefaultVersionMenuItemProps,
  type VersionMenuAction,
} from "./VersionMenuItem.js";

/** Shared presentation for the default actions; null overrides hide icon/label. */
export function DefaultVersionMenuItem({
  action,
  defaultIcon,
  defaultLabel,
  icon = defaultIcon,
  children = defaultLabel,
  ...props
}: DefaultVersionMenuItemProps & {
  action: VersionMenuAction;
  defaultIcon: ReactNode;
  defaultLabel: ReactNode;
}) {
  if (!action.available) {
    return null;
  }
  return (
    <VersionMenuItem
      {...props}
      icon={icon}
      onClick={() => void action.execute()}
    >
      {children}
    </VersionMenuItem>
  );
}
