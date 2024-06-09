import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTab = forwardRef<
  HTMLDivElement,
  ComponentProps["FilePanel"]["TabPanel"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
});
