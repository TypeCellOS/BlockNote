import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { cn } from "../lib/utils";

export const PanelTab = forwardRef<
  HTMLDivElement,
  ComponentProps["ImagePanel"]["TabPanel"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      className={cn(
        className,
        "flex flex-col gap-2 items-start justify-center"
      )}
      ref={ref}>
      {children}
    </div>
  );
});
