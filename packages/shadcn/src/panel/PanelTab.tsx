import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils";

export const PanelTab = forwardRef<
  HTMLDivElement,
  ComponentProps["FilePanel"]["TabPanel"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div
      className={cn(
        className,
        "bn-flex bn-flex-col bn-gap-2 bn-items-start bn-justify-center"
      )}
      ref={ref}>
      {children}
    </div>
  );
});
