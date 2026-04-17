import { Loader as MantineLoader } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return (
    <div className={className} ref={ref}>
      <MantineLoader type="dots" size={16} />
    </div>
  );
});
