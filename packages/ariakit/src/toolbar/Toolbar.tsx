import { Toolbar as AriakitToolbar } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const { className, children, onMouseEnter, onMouseLeave, ...rest } = props;

    assertEmpty(rest);

    return (
      <AriakitToolbar
        className={mergeCSSClasses("bn-ak-toolbar", className || "")}
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        {children}
      </AriakitToolbar>
    );
  }
);
