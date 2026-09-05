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
import { createContext, forwardRef, useContext } from "react";

// Hands the `portalElement` prop from `Menu` (the root) down to
// `MenuDropdown`, where Ariakit takes it.
const MenuPortalElementContext = createContext<HTMLElement | null>(null);

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position,
    portalElement,
    // ariakit's `virtualFocus` keeps DOM focus on the editor (roving via
    // `aria-activedescendant`), so there is no focus to suppress here.
    preventFocusOnOpen: _preventFocusOnOpen,
    sub: _sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <AriakitMenuProvider
      placement={position}
      setOpen={onOpenChange}
      virtualFocus={true}
    >
      <MenuPortalElementContext.Provider value={portalElement}>
        {children}
      </MenuPortalElementContext.Provider>
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
    sub: _sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  const portalElement = useContext(MenuPortalElementContext);

  return (
    <AriakitMenu
      unmountOnHide={true}
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      // Ariakit falls back to a body-appended div for a missing element, so
      // don't portal at all until there is one (editor not mounted yet).
      portal={portalElement !== null}
      portalElement={portalElement}
      ref={ref}
    >
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
        onClick={onClick}
      >
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
      onClick={onClick}
    >
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
      ref={ref}
    >
      {children}
    </AriakitMenuGroupLabel>
  );
});

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"],
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
