import { Toolbar as AriakitToolbar } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["Generic"]["Toolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const {
      className,
      "aria-label": ariaLabel,
      children,
      onMouseEnter,
      onMouseLeave,
      trapFocus: _trapFocus,
      variant: _variant,
      ...rest
    } = props;

    assertEmpty(rest);

    return (
      <AriakitToolbar
        className={mergeCSSClasses("bn-ak-toolbar", className || "")}
        aria-label={ariaLabel}
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </AriakitToolbar>
    );
  },
);
