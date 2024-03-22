import * as Ariakit from "@ariakit/react";
import { mergeCSSClasses } from "@blocknote/core";
import { forwardRef, HTMLAttributes } from "react";

export const Toolbar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.Toolbar
      className={mergeCSSClasses("bn-toolbar", className || "")}
      ref={ref}
      {...rest}>
      {children}
    </Ariakit.Toolbar>
  );
});

// export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
//
