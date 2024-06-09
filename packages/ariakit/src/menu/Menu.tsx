import {
  CheckboxCheck as AriakitCheckboxCheck,
  Menu as AriakitMenu,
  MenuButton as AriakitMenuButton,
  MenuButtonArrow as AriakitMenuButtonArrow,
  MenuGroupLabel as AriakitMenuGroupLabel,
  MenuItem as AriakitMenuItem,
  MenuProvider as AriakitMenuProvider,
  MenuSeparator as AriakitMenuSeparator,
} from "@ariakit/react";

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
    <AriakitMenuProvider
      placement={position}
      setOpen={onOpenChange}
      virtualFocus={true}>
      {children}
    </AriakitMenuProvider>
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
    <AriakitMenu
      unmountOnHide={true}
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      ref={ref}>
      {children}
    </AriakitMenu>
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
      <AriakitMenuButton
        render={<AriakitMenuItem />}
        className={mergeCSSClasses("bn-ak-menu-item", className || "")}
        ref={ref}
        onClick={onClick}>
        {icon}
        {children}
        <AriakitMenuButtonArrow />
        {checked !== undefined && <AriakitCheckboxCheck checked={checked} />}
      </AriakitMenuButton>
    );
  }
  return (
    <AriakitMenuItem
      className={mergeCSSClasses("bn-ak-menu-item", className || "")}
      ref={ref}
      onClick={onClick}>
      {icon}
      {children}
      {checked !== undefined && <AriakitCheckboxCheck checked={checked} />}
    </AriakitMenuItem>
  );
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitMenuGroupLabel
      className={mergeCSSClasses("bn-ak-group-label", className || "")}
      ref={ref}>
      {children}
    </AriakitMenuGroupLabel>
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

  return <AriakitMenuButton render={children as any}></AriakitMenuButton>;
};

export const MenuDivider = forwardRef<
  HTMLHRElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitMenuSeparator
      className={mergeCSSClasses("bn-ak-separator", className || "")}
      ref={ref}
    />
  );
});
