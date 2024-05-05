import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["Button"]
>((props, ref) => {
  const { className, children, onClick, label, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.Button
      className={mergeCSSClasses("bn-ak-button", className || "")}
      onClick={onClick}
      aria-label={label}
      ref={ref}>
      {children}
    </Ariakit.Button>
  );
});
