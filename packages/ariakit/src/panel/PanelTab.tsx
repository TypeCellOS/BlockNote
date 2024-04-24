import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTab = forwardRef<
  HTMLDivElement,
  ComponentProps["ImagePanel"]["TabPanel"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
});
