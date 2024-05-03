import { ComponentPropsWithoutRef, forwardRef } from "react";
import { mergeCSSClasses } from "@blocknote/core";

export const FilePanelTab = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <div
      className={mergeCSSClasses("bn-file-panel-tab", className || "")}
      {...rest}
      ref={ref}>
      {children}
    </div>
  );
});
