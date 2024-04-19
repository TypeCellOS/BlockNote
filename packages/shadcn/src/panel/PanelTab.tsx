import { ComponentProps } from "@blocknote/react";

export const PanelTab = (props: ComponentProps["ImagePanel"]["TabPanel"]) => {
  const { children, ...rest } = props;

  return <div {...rest}>{children}</div>;
};
