import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { HiChevronRight } from "react-icons/hi";

const SubMenuContext = createContext<
  | {
      onTriggerMouseOver: () => void;
      onTriggerMouseLeave: () => void;
      onMenuMouseOver: () => void;
      onMenuMouseLeave: () => void;
    }
  | undefined
>(undefined);

const SubMenu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { children, onOpenChange, position } = props;

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
        withinPortal={false}
        middlewares={{ flip: true, shift: true, inline: false, size: true }}
        opened={opened}
        onClose={() => onOpenChange?.(false)}
        onOpen={() => onOpenChange?.(true)}
        position={position}>
        {children}
      </Mantine.Menu>
    </SubMenuContext.Provider>
  );
};

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { children, onOpenChange, position, sub } = props;

  if (sub) {
    return <SubMenu {...props} />;
  }

  return (
    <Mantine.Menu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      position={position}>
      {children}
    </Mantine.Menu>
  );
};

export const MenuItem = (props: ComponentProps["Generic"]["Menu"]["Item"]) => {
  const { className, children, icon, checked, subTrigger, onClick } = props;

  const ctx = useContext(SubMenuContext);

  const onMouseLeave = subTrigger ? ctx!.onTriggerMouseLeave : undefined;
  const onMouseOver = subTrigger ? ctx!.onTriggerMouseOver : undefined;

  return (
    <Mantine.MenuItem
      className={className}
      component="div"
      leftSection={icon}
      rightSection={
        <>
          {checked ? (
            <Mantine.CheckIcon size={10} />
          ) : !checked ? (
            <div className={"bn-tick-space"} />
          ) : undefined}
          {subTrigger && <HiChevronRight size={15} />}
        </>
      }
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onClick={onClick}>
      {children}
    </Mantine.MenuItem>
  );
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { children } = props;

  return <Mantine.MenuTarget>{children}</Mantine.MenuTarget>;
};

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"]
) => {
  const { className, children, sub } = props;

  const ctx = useContext(SubMenuContext);

  return (
    <Mantine.MenuDropdown
      className={className}
      onMouseOver={ctx?.onMenuMouseOver}
      onMouseLeave={ctx?.onMenuMouseLeave}
      style={sub ? { marginLeft: "5px" } : {}} // TODO: Needed?
    >
      {children}
    </Mantine.MenuDropdown>
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"]
) => {
  const { className } = props;

  return <Mantine.MenuDivider className={className} />;
};

export const MenuLabel = (
  props: ComponentProps["Generic"]["Menu"]["Label"]
) => {
  const { className, children } = props;

  return (
    <Mantine.MenuLabel className={className}>{children}</Mantine.MenuLabel>
  );
};
