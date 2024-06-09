import { Button as AriakitButton } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const TableHandle = forwardRef<
  HTMLButtonElement,
  ComponentProps["TableHandle"]["Root"]
>((props, ref) => {
  const {
    className,
    children,
    draggable,
    onDragStart,
    onDragEnd,
    style,
    label,
    ...rest
  } = props;

  // false, because rest props can be added by ariakit when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  return (
    <AriakitButton
      className={mergeCSSClasses(
        "bn-ak-button bn-ak-secondary",
        className || ""
      )}
      ref={ref}
      aria-label={label}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={style}
      {...rest}>
      {children}
    </AriakitButton>
  );
});
