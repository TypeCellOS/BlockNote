import { Group as MantineGroup } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const GridSuggestionMenuEmptyItem = forwardRef<
  HTMLDivElement,
  ComponentProps["GridSuggestionMenu"]["EmptyItem"]
>((props, ref) => {
  const { className, children, columns, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantineGroup
      className={className}
      style={{ gridColumn: `1 / ${columns + 1}` }}
      ref={ref}
    >
      <MantineGroup className="bn-mt-suggestion-menu-item-title">
        {children}
      </MantineGroup>
    </MantineGroup>
  );
});
