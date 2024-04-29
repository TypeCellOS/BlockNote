import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const { className, children } = props;

  // TODO Test
  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
});
