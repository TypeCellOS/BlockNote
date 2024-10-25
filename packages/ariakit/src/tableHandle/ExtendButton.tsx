import { Button as AriakitButton } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const ExtendButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["TableHandle"]["ExtendButton"]
>((props, ref) => {
  const { children, className, onMouseDown, onClick, ...rest } = props;

  // false, because rest props can be added by mantine when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  return (
    <AriakitButton
      className={mergeCSSClasses(
        "bn-ak-button bn-ak-secondary",
        className || ""
      )}
      ref={ref}
      onMouseDown={onMouseDown}
      onClick={onClick}
      {...rest}>
      {children}
    </AriakitButton>
  );
});
