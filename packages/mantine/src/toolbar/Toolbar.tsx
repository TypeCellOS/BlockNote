import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (props: ToolbarProps) => {
  const { children, ...rest } = props;

  return <Mantine.Group {...rest}>{children}</Mantine.Group>;
};
