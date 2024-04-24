import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuEmptyItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["EmptyItem"]
>((props, ref) => {
  const { className } = props;

  return (
    <Mantine.Group className={className} ref={ref}>
      <Mantine.Group className="bn-mt-suggestion-menu-item-label">
        No items found
      </Mantine.Group>
    </Mantine.Group>
  );
});
