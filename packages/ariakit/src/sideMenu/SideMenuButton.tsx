import { Button as AriakitButton } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const {
    className,
    children,
    icon,
    onClick,
    label,
    onDragEnd,
    onDragStart,
    draggable,
    ...rest
  } = props;

  // false, because rest props can be added by ariakit when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  return (
    <AriakitButton
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      draggable={draggable}
      aria-label={label}
      className={mergeCSSClasses(
        "bn-ak-button bn-ak-secondary",
        className || ""
      )}
      ref={ref}
      onClick={onClick}
      {...rest}>
      {icon}
      {children}
    </AriakitButton>
  );
});
