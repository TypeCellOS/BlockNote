import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const {
    className,
    children, // unused, using "dots" instead
    ...rest
  } = props;

  assertEmpty(rest);

  return <Mantine.Loader className={className} type="dots" ref={ref} />;
});
