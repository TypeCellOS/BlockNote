import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, id, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.Group
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      id={id}
      role="listbox"
      ref={ref}>
      {children}
    </Ariakit.Group>
  );
});
