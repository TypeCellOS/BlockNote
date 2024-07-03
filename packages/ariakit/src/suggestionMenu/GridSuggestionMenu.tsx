import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const GridSuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["GridSuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, id, style, ...rest } = props;

  assertEmpty(rest);

  return (
    <div className={className} style={style} ref={ref} id={id} role="grid">
      {children}
    </div>
  );
});
