import {
  type ComponentProps,
  VersioningSidebarRoot,
  VersioningSnapshotRow,
} from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => (
  <VersioningSidebarRoot {...props} className={cn(props.className)} ref={ref} />
));

export const Snapshot = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Snapshot"]
>((props, ref) => {
  const ShadCNComponents = useShadCNComponentsContext()!;
  return (
    <VersioningSnapshotRow
      {...props}
      as={ShadCNComponents.Card.Card}
      // Neutralize Card defaults that conflict with the shared sidebar CSS.
      className={cn(props.className, "gap-0 rounded-lg py-0 shadow-none")}
      ref={ref}
    />
  );
});
