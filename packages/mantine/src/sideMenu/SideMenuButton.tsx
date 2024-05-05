import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
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
    onDragEnd,
    onDragStart,
    draggable,
    label,
    ...rest
  } = props;

  // false, because rest props can be added by mantine when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  if (icon) {
    return (
      <Mantine.ActionIcon
        size={24}
        className={className}
        ref={ref}
        onClick={onClick}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        draggable={draggable}
        aria-label={label}
        {...rest}>
        {icon}
      </Mantine.ActionIcon>
    );
  }

  return (
    <Mantine.Button
      className={className}
      ref={ref}
      onClick={onClick}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      draggable={draggable}
      aria-label={label}
      {...rest}>
      {children}
    </Mantine.Button>
  );
});
