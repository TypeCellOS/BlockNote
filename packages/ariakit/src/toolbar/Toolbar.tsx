import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (props: ToolbarProps) => {
  const { className, children, onMouseEnter, onMouseLeave } = props;

  return (
    <Ariakit.Toolbar
      className={mergeCSSClasses("toolbar", className || "")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {children}
    </Ariakit.Toolbar>
  );
};
