import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position,
    sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <Ariakit.MenuProvider
      placement={position}
      setOpen={onOpenChange}
      virtualFocus={true}>
      {children}
    </Ariakit.MenuProvider>
  );
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Dropdown"]
>((props, ref) => {
  const {
    className,
    children,
    sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <Ariakit.Menu
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      ref={ref}>
      {children}
    </Ariakit.Menu>
  );
});

export const MenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Item"]
>((props, ref) => {
  const { className, children, icon, checked, subTrigger, onClick, ...rest } =
    props;

  assertEmpty(rest);

  if (subTrigger) {
    return (
      <Ariakit.MenuButton
        render={<Ariakit.MenuItem />}
        className={mergeCSSClasses("bn-ak-menu-item", className || "")}
        ref={ref}
        onClick={onClick}>
        {icon}
        {children}
        <Ariakit.MenuButtonArrow />
        {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
      </Ariakit.MenuButton>
    );
  }
  return (
    <Ariakit.MenuItem
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={ref}
      onClick={onClick}>
      {icon}
      {children}
      {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
    </Ariakit.MenuItem>
  );
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.MenuGroupLabel
      className={mergeCSSClasses("bn-ak-group-label", className || "")}
      ref={ref}>
      {children}
    </Ariakit.MenuGroupLabel>
  );
});

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { children, sub, ...rest } = props;

  assertEmpty(rest);

  if (sub) {
    return children;
  }

  return <Ariakit.MenuButton render={children as any}></Ariakit.MenuButton>;
};

export const MenuDivider = forwardRef<
  HTMLHRElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.MenuSeparator
      className={mergeCSSClasses("bn-ak-separator", className || "")}
      ref={ref}
    />
  );
});
