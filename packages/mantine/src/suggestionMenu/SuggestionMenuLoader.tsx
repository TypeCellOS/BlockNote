import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const { className } = props;

  // TODO Test
  return (
    <Mantine.Group className={className} ref={ref}>
      Loading&ellipsis;
    </Mantine.Group>
  );
});
