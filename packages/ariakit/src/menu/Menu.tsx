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
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { createContext, forwardRef, useContext } from "react";

// Hands the `portalElement` and `preventFocusOnOpen` props from `Menu` (the
// root) down to `MenuDropdown`, where Ariakit takes them.
const MenuRootPropsContext = createContext<{
  portalElement: HTMLElement | null;
  preventFocusOnOpen: boolean;
}>({ portalElement: null, preventFocusOnOpen: false });

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position,
    portalElement,
    preventFocusOnOpen,
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
      <MenuRootPropsContext.Provider
        value={{
          portalElement,
          preventFocusOnOpen: preventFocusOnOpen ?? false,
        }}
      >
        {children}
      </MenuRootPropsContext.Provider>
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

  const { portalElement, preventFocusOnOpen } =
    useContext(MenuRootPropsContext);

  return (
    <AriakitMenu
      unmountOnHide={true}
      className={mergeCSSClasses("bn-ak-menu", className || "")}
      // `virtualFocus` does not keep DOM focus on the editor: on show, Ariakit
      // focuses the menu element itself (items then rove via
      // `aria-activedescendant`), which on the mobile toolbar blurs the editor
      // and closes the keyboard. A function, not `false`: Ariakit's Menu
      // treats a falsy prop as "defer to the store", and its MenuButton sets
      // that store flag on every click, so `false` still focuses the menu.
      // How-to-test: without the callback, opening the colors menu from the mobile toolbar moves focus into the menu and closes the keyboard (covered by skinFocus, android, ariakit: "opening the colors menu keeps focus in the editor").
      autoFocusOnShow={preventFocusOnOpen ? () => false : true}
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

  // Under `preventFocusOnOpen`, hovering an item (a tap's compat mousemove
  // included) must not focus the menu.
  const { preventFocusOnOpen } = useContext(MenuRootPropsContext);

  if (subTrigger) {
    return (
      <AriakitMenuButton
        render={
          <AriakitMenuItem
            focusOnHover={!preventFocusOnOpen}
            onMouseDown={preventFocusOnTap}
          />
        }
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
      // How-to-test: with hover focus on, tapping a color focuses the menu through the tap's compat mousemove and closes the keyboard (covered by skinFocus, android, ariakit: "picking from the colors menu leaves focus in the editor").
      focusOnHover={!preventFocusOnOpen}
      // How-to-test: without the tap guard, tapping a color focuses the item and closes the keyboard (covered by the same case).
      onMouseDown={preventFocusOnTap}
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
