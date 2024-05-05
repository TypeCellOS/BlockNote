import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuEmptyItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["EmptyItem"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Mantine.Group className={className} ref={ref}>
      <Mantine.Group className="bn-mt-suggestion-menu-item-label">
        {children}
      </Mantine.Group>
    </Mantine.Group>
  );
});
