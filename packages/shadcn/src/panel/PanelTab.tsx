import { ComponentProps } from "@blocknote/react";

export const PanelTab = (props: ComponentProps["ImagePanel"]["TabPanel"]) => {
  const { className, children } = props;

  return <div className={className}>{children}</div>;
};
