import { Group as AriakitGroup } from "@ariakit/react";

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
    <AriakitGroup
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      id={id}
      role="listbox"
      ref={ref}>
      {children}
    </AriakitGroup>
  );
});
