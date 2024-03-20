import * as Ariakit from "@ariakit/react";
import { mergeCSSClasses } from "@blocknote/core";
import { HTMLAttributes, forwardRef } from "react";
import { MenuItemProps, MenuProps } from "../../editor/ComponentsContext";
export { MenuSeparator as MenuDivider } from "@ariakit/react";

export const Menu = (props: MenuProps) => {
  const { onOpenChange, position, ...rest } = props;

  return (
    <Ariakit.MenuProvider
      placement={position}
      setOpen={onOpenChange}
      virtualFocus={true}
      // activeId={}
      {...rest}
    />
  );
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.Menu
      {...rest}
      className={mergeCSSClasses("bn-menu", className || "")}
      ref={ref}>
      {children}
    </Ariakit.Menu>
  );
});

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (props, ref) => {
    const { className, children, icon, checked, expandArrow, ...rest } = props;

    if (expandArrow) {
      return (
        <Ariakit.MenuButton
          {...rest}
          className={mergeCSSClasses("bn-menu-item", className || "")}
          ref={ref}>
          {icon}
          {children}
          <Ariakit.MenuButtonArrow />
          {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
        </Ariakit.MenuButton>
      );
    }
    return (
      <Ariakit.MenuItem
        {...rest}
        className={mergeCSSClasses("bn-menu-item", className || "")}
        ref={ref}>
        {icon}
        {children}
        {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
      </Ariakit.MenuItem>
    );
  }
);

export const MenuLabel = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.MenuGroupLabel
      {...rest}
      className={mergeCSSClasses("bn-menu-label", className || "")}
      ref={ref}>
      {children}
    </Ariakit.MenuGroupLabel>
  );
});

export const MenuTrigger = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.MenuButton
      {...rest}
      className={mergeCSSClasses(className || "")}
      ref={ref}
      render={children as any}></Ariakit.MenuButton>
  );
});
