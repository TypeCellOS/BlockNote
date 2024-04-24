import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const { className } = props;

  // TODO Test
  return (
    <div className={className} ref={ref}>
      Loading&ellipsis;
    </div>
  );
});
