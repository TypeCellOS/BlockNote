import { Button as MantineButton } from "@mantine/core";

import { forwardRef } from "react";
import { ComponentProps } from "@blocknote/react";
import { assertEmpty } from "@blocknote/core";

export const ExtendButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["TableHandle"]["ExtendButton"]
>((props, ref) => {
  const { children, className, onMouseDown, ...rest } = props;

  // false, because rest props can be added by mantine when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  return (
    <MantineButton
      className={className}
      ref={ref}
      onMouseDown={onMouseDown}
      {...rest}>
      {children}
    </MantineButton>
  );
});
