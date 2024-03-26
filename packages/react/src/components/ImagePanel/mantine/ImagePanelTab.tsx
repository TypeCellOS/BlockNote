import { mergeCSSClasses } from "@blocknote/core";
import { ComponentPropsWithoutRef, forwardRef } from "react";

export const ImagePanelTab = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <div
      className={mergeCSSClasses("bn-image-panel-tab", className || "")}
      {...rest}
      ref={ref}>
      {children}
    </div>
  );
});
