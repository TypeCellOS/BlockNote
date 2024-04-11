import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

export const PanelTab = (props: ComponentProps["ImagePanel"]["TabPanel"]) => {
  const { className, children, ...rest } = props;

  return (
    <div
      className={mergeCSSClasses("bn-image-panel-tab", className || "")}
      {...rest}>
      {children}
    </div>
  );
};
