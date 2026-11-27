import {
  ActionIcon as MantineActionIcon,
  Button as MantineButton,
} from "@mantine/core";

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
      <MantineActionIcon
        size={24}
        className={mergeCSSClasses("bn-side-menu-button", className)}
        ref={ref}
        onClick={onClick}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        draggable={draggable}
        aria-label={label}
        {...rest}
      >
        {icon}
      </MantineActionIcon>
    );
  }

  return (
    <MantineButton
      className={mergeCSSClasses("bn-side-menu-button", className)}
      ref={ref}
      onClick={onClick}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      draggable={draggable}
      aria-label={label}
      {...rest}
    >
      {children}
    </MantineButton>
  );
});
