import * as Mantine from "@mantine/core";

import {
  MenuDropdownProps,
  MenuItemProps,
  MenuProps,
  MenuTriggerProps,
} from "@blocknote/react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { HiChevronRight } from "react-icons/hi";
import { MenuDividerProps } from "@mantine/core";

const SubMenuContext = createContext<
  | {
      onTriggerMouseOver: () => void;
      onTriggerMouseLeave: () => void;
      onMenuMouseOver: () => void;
      onMenuMouseLeave: () => void;
    }
  | undefined
>(undefined);

const SubMenu = (props: MenuProps) => {
  const { sub, onOpenChange, ...rest } = props;

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
      <Mantine.Menu
        opened={opened}
        withinPortal={false}
        middlewares={{ flip: true, shift: true, inline: false, size: true }}
        onClose={() => onOpenChange?.(false)}
        onOpen={() => onOpenChange?.(true)}
        closeOnItemClick={false}
        {...rest}
        position="right"
      />
    </SubMenuContext.Provider>
  );
};

export const Menu = (props: MenuProps) => {
  const { sub, onOpenChange, ...rest } = props;

  if (sub) {
    return <SubMenu {...props} />;
  }

  return (
    <Mantine.Menu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      closeOnItemClick={false}
      {...rest}
      position="right"
    />
  );
};

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (props, ref) => {
    const { icon, checked, subTrigger, ...rest } = props;
    const ctx = useContext(SubMenuContext);

    const onMouseLeave = subTrigger ? ctx!.onTriggerMouseLeave : undefined;
    const onMouseOver = subTrigger ? ctx!.onTriggerMouseOver : undefined;

    return (
      <Mantine.MenuItem
        component="div"
        leftSection={icon}
        rightSection={
          <>
            {checked ? (
              <Mantine.CheckIcon size={10} />
            ) : checked === false ? (
              <div className={"bn-tick-space"} />
            ) : undefined}
            {subTrigger && <HiChevronRight size={15} />}
          </>
        }
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        {...rest}
        ref={ref}
      />
    );
  }
);

export const MenuTrigger = forwardRef<HTMLDivElement, MenuTriggerProps>(
  (props, ref) => {
    const { sub, children, ...rest } = props;
    return (
      <Mantine.MenuTarget {...rest} ref={ref}>
        {children}
      </Mantine.MenuTarget>
    );
  }
);

export const MenuDropdown = forwardRef<HTMLDivElement, MenuDropdownProps>(
  (props, ref) => {
    const { sub, ...rest } = props;
    const ctx = useContext(SubMenuContext);

    return (
      <Mantine.MenuDropdown
        onMouseOver={ctx?.onMenuMouseOver}
        onMouseLeave={ctx?.onMenuMouseLeave}
        style={sub ? { marginLeft: "5px" } : {}} // TODO: Needed?
        {...rest}
        ref={ref}
      />
    );
  }
);

export const MenuDivider = forwardRef<HTMLDivElement, MenuDividerProps>(
  (props, ref) => {
    return <Mantine.MenuDivider {...props} ref={ref} />;
  }
);

export const MenuLabel = forwardRef<HTMLDivElement, Record<string, never>>(
  (props, ref) => {
    return <Mantine.MenuLabel {...props} ref={ref} />;
  }
);
