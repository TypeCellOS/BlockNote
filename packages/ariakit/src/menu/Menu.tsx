import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { MenuItemProps, MenuProps, MenuLabelProps } from "@blocknote/react";
import { HTMLAttributes, forwardRef } from "react";

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
    const { children, icon, checked, subTrigger, onClick } = props;

    if (subTrigger) {
      return (
        <Ariakit.MenuButton className={"bn-menu-item"} ref={ref}>
          {icon}
          {children}
          <Ariakit.MenuButtonArrow />
          {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
        </Ariakit.MenuButton>
      );
    }
    return (
      <Ariakit.MenuItem className={"bn-menu-item"} ref={ref}>
        {icon}
        {children}
        {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
      </Ariakit.MenuItem>
    );
  }
);

export const MenuLabel = forwardRef<HTMLDivElement, MenuLabelProps>(
  (props, ref) => {
    const { className, children, ...rest } = props;

    return (
      <Ariakit.MenuGroupLabel
        {...rest}
        className={mergeCSSClasses("bn-menu-label", className || "")}
        ref={ref}>
        {children}
      </Ariakit.MenuGroupLabel>
    );
  }
);

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

export const MenuDivider = forwardRef<
  HTMLHRElement,
  Ariakit.MenuSeparatorProps
>((props, ref) => {
  return <Ariakit.MenuSeparator {...props} ref={ref} />;
});
