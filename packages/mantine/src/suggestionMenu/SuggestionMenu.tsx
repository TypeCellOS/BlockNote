import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Mantine.Stack gap={0} className={className} ref={ref}>
      {children}
    </Mantine.Stack>
  );
});
