import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Label"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Mantine.Group className={className} ref={ref}>
      {children}
    </Mantine.Group>
  );
});
