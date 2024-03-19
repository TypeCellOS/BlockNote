import * as Ariakit from "@ariakit/react";
import { mergeCSSClasses } from "@blocknote/core";
import { HTMLAttributes, forwardRef } from "react";
import { MenuProps } from "../../editor/ComponentsContext";
export {
  MenuSeparator as MenuDivider,
  MenuItem as MenuLabel,
} from "@ariakit/react";

export const Menu = (props: MenuProps) => {
  const { onOpenChange, position, ...rest } = props;

  return (
    <Ariakit.MenuProvider
      placement={position}
      setOpen={onOpenChange}
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

export const MenuItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.MenuItem
      {...rest}
      className={mergeCSSClasses("bn-menu-item", className || "")}
      ref={ref}>
      {children}
    </Ariakit.MenuItem>
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
      className={mergeCSSClasses("bn-menu-item", className || "")}
      ref={ref}
      render={children as any}></Ariakit.MenuButton>
  );
});
