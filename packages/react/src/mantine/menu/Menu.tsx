import * as mantine from "@mantine/core";
import React, { useCallback, useContext, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import {
  MenuDropdownProps,
  MenuItemProps,
  MenuProps,
  MenuTriggerProps,
} from "../../editor/ComponentsContext";

const SubMenuContext = React.createContext<
  | {
      onTriggerMouseOver: () => void;
      onTriggerMouseLeave: () => void;
      onMenuMouseOver: () => void;
      onMenuMouseLeave: () => void;
    }
  | undefined
>(undefined);

const SubMenu = (props: MenuProps) => {
  const { sub, onOpenChange, open, defaultOpen, ...rest } = props;

  const [opened, setOpened] = useState(false);

  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>();

  const mouseLeave = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
    }
    menuCloseTimer.current = setTimeout(() => {
      setOpened(false);
    }, 250);
  }, []);

  const mouseOver = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
    }

    setOpened(true);
  }, []);

  return (
    <SubMenuContext.Provider
      value={{
        onTriggerMouseOver: mouseOver,
        onTriggerMouseLeave: mouseLeave,
        onMenuMouseOver: mouseOver,
        onMenuMouseLeave: mouseLeave,
      }}>
      <mantine.Menu
        opened={opened}
        withinPortal={false}
        middlewares={{ flip: true, shift: true, inline: false, size: true }}
        onClose={() => onOpenChange?.(false)}
        onOpen={() => onOpenChange?.(true)}
        defaultOpened={defaultOpen}
        closeOnItemClick={false}
        {...rest}
        position="right"
      />
    </SubMenuContext.Provider>
  );
};

export const Menu = (props: MenuProps) => {
  const { sub, onOpenChange, open, defaultOpen, ...rest } = props;

  if (sub) {
    return <SubMenu {...props} />;
  }

  return (
    <mantine.Menu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      defaultOpened={defaultOpen}
      closeOnItemClick={false}
      {...rest}
      position="right"
    />
  );
};

export const MenuItem = React.forwardRef((props: MenuItemProps, ref) => {
  const { icon, checked, expandArrow, subTrigger, ...rest } = props;
  const ctx = useContext(SubMenuContext);

  const onMouseLeave = subTrigger ? ctx!.onTriggerMouseLeave : undefined;
  const onMouseOver = subTrigger ? ctx!.onTriggerMouseOver : undefined;

  return (
    <mantine.MenuItem
      component="div"
      leftSection={icon}
      rightSection={
        <>
          {checked ? (
            <mantine.CheckIcon size={10} />
          ) : checked === false ? (
            <div className={"bn-tick-space"} />
          ) : undefined}
          {expandArrow && <HiChevronRight size={15} />}
        </>
      }
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      {...rest}
      ref={ref}
    />
  );
});

export const MenuTrigger = React.forwardRef((props: MenuTriggerProps, ref) => {
  const { sub, ...rest } = props;
  return <mantine.MenuTarget {...rest} ref={ref} />;
});

export const MenuDropdown = React.forwardRef(
  (props: MenuDropdownProps, ref) => {
    const { sub, ...rest } = props;
    const ctx = useContext(SubMenuContext);

    return (
      <mantine.MenuDropdown
        onMouseOver={ctx?.onMenuMouseOver}
        onMouseLeave={ctx?.onMenuMouseLeave}
        style={sub ? { marginLeft: "5px" } : {}} // TODO: Needed?
        {...rest}
        ref={ref}
      />
    );
  }
);

export const MenuDivider = React.forwardRef((props, ref) => {
  return <mantine.MenuDivider {...props} ref={ref} />;
});

export const MenuLabel = React.forwardRef((props, ref) => {
  return <mantine.MenuLabel {...props} ref={ref} />;
});
