import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Ariakit.Group
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      ref={ref}>
      {children}
    </Ariakit.Group>
  );
});
