import { Stack } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children, id, ...rest } = props;

  assertEmpty(rest);

  return (
    <Stack gap={0} className={className} ref={ref} id={id} role="listbox">
      {children}
    </Stack>
  );
});
