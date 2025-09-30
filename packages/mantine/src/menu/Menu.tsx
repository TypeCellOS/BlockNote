import {
  CheckIcon as MantineCheckIcon,
  Menu as MantineMenu,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { createContext, forwardRef, useContext } from "react";

const SubMenuContext = createContext<
  | {
      onMenuMouseOver: () => void;
      onMenuMouseLeave: () => void;
    }
  | undefined
>(undefined);

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { children, onOpenChange, position, sub, ...rest } = props;

  assertEmpty(rest);

  if (sub) {
    return (
      <MantineMenu.Sub
        transitionProps={{ duration: 250, exitDelay: 250 }}
        withinPortal={false}
        middlewares={{ flip: true, shift: true, inline: false, size: true }}
        onChange={onOpenChange}
        position={position}
      >
        {children}
      </MantineMenu.Sub>
    );
  }

  return (
    <MantineMenu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onChange={onOpenChange}
      position={position}
    >
      {children}
    </MantineMenu>
  );
};

export const MenuItem = forwardRef<
  HTMLButtonElement & HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Item"]
>((props, ref) => {
  const { className, children, icon, checked, subTrigger, onClick, ...rest } =
    props;

  // false, because rest props can be added by mantine when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  if (subTrigger) {
    return (
      <MantineMenu.Sub.Item
        className={className}
        ref={ref}
        leftSection={icon}
        rightSection={
          checked ? (
            <MantineCheckIcon size={10} />
          ) : checked === false ? (
            <div className={"bn-tick-space"} />
          ) : null
        }
        onClick={onClick}
        {...rest}
      >
        {children}
      </MantineMenu.Sub.Item>
    );
  }

  return (
    <MantineMenu.Item
      className={className}
      ref={ref}
      leftSection={icon}
      rightSection={
        checked ? (
          <MantineCheckIcon size={10} />
        ) : checked === false ? (
          <div className={"bn-tick-space"} />
        ) : null
      }
      onClick={onClick}
      {...rest}
    >
      {children}
    </MantineMenu.Item>
  );
});

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"],
) => {
  const {
    children,
    sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  if (sub) {
    return <MantineMenu.Sub.Target>{children}</MantineMenu.Sub.Target>;
  }

  return <MantineMenu.Target>{children}</MantineMenu.Target>;
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Dropdown"]
>((props, ref) => {
  const {
    className,
    children,
    sub, //unused
    ...rest
  } = props;

  assertEmpty(rest);

  const ctx = useContext(SubMenuContext);

  if (sub) {
    return (
      <MantineMenu.Sub.Dropdown
        className={className}
        ref={ref}
        onMouseOver={ctx?.onMenuMouseOver}
        onMouseLeave={ctx?.onMenuMouseLeave}
      >
        {children}
      </MantineMenu.Sub.Dropdown>
    );
  }

  return (
    <MantineMenu.Dropdown
      className={className}
      ref={ref}
      onMouseOver={ctx?.onMenuMouseOver}
      onMouseLeave={ctx?.onMenuMouseLeave}
    >
      {children}
    </MantineMenu.Dropdown>
  );
});

export const MenuDivider = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return <MantineMenu.Divider className={className} ref={ref} />;
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantineMenu.Label className={className} ref={ref}>
      {children}
    </MantineMenu.Label>
  );
});
