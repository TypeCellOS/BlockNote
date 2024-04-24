import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["Button"]
>((props, ref) => {
  const { className, children, onClick } = props;

  return (
    <Ariakit.Button
      className={mergeCSSClasses("bn-ak-button", className || "")}
      onClick={onClick}
      ref={ref}>
      {children}
    </Ariakit.Button>
  );
});
