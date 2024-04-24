import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const { className, children, onMouseEnter, onMouseLeave } = props;

    return (
      <Ariakit.Toolbar
        className={mergeCSSClasses("bn-ak-toolbar", className || "")}
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        {children}
      </Ariakit.Toolbar>
    );
  }
);
