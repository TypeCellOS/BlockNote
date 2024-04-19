import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (props: ToolbarProps) => {
  const { className, children, onMouseEnter, onMouseLeave } = props;

  return (
    <Mantine.Group
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {children}
    </Mantine.Group>
  );
};
