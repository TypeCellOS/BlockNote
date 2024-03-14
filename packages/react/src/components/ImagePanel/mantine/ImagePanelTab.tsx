import { ComponentPropsWithoutRef, forwardRef } from "react";
import { mergeCSSClasses } from "@blocknote/core";

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
