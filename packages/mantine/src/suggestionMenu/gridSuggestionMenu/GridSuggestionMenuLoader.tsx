import { Loader as MantineLoader } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const GridSuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["GridSuggestionMenu"]["Loader"]
>((props, ref) => {
  const {
    className,
    children, // unused, using "dots" instead
    columns,
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <div style={{ gridColumn: `1 / ${columns + 1}` }} ref={ref}>
      <MantineLoader className={className} type="dots" />
    </div>
  );
});
