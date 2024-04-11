import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (props: ToolbarProps) => {
  const { children, ...rest } = props;

  return <Ariakit.Toolbar {...rest}>{children}</Ariakit.Toolbar>;
};
