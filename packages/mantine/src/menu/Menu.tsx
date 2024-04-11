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
        onClose={() => props.onOpenChange?.(false)}
        onOpen={() => props.onOpenChange?.(true)}
        closeOnItemClick={false}
        position="right"
      />
    </SubMenuContext.Provider>
  );
};

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { sub, onOpenChange, ...rest } = props;

  if (sub) {
    return <SubMenu {...props} />;
  }

  return (
    <Mantine.Menu
      withinPortal={false}
      // middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      closeOnItemClick={false}
      {...rest}
      position="right"
    />
  );
};

export const MenuItem = (props: ComponentProps["Generic"]["Menu"]["Item"]) => {
  const ctx = useContext(SubMenuContext);

  const onMouseLeave = props.subTrigger ? ctx!.onTriggerMouseLeave : undefined;
  const onMouseOver = props.subTrigger ? ctx!.onTriggerMouseOver : undefined;

  return (
    <Mantine.MenuItem
      className={props.className}
      component="div"
      leftSection={props.icon}
      rightSection={
        <>
          {props.checked ? (
            <Mantine.CheckIcon size={10} />
          ) : !props.checked ? (
            <div className={"bn-tick-space"} />
          ) : undefined}
          {props.subTrigger && <HiChevronRight size={15} />}
        </>
      }
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    />
  );
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => <Mantine.MenuTarget>{props.children}</Mantine.MenuTarget>;

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"]
) => {
  const ctx = useContext(SubMenuContext);

  return (
    <Mantine.MenuDropdown
      className={props.className}
      onMouseOver={ctx?.onMenuMouseOver}
      onMouseLeave={ctx?.onMenuMouseLeave}
      style={props.sub ? { marginLeft: "5px" } : {}} // TODO: Needed?
    />
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"]
) => <Mantine.MenuDivider {...props} />;

export const MenuLabel = (
  props: ComponentProps["Generic"]["Menu"]["Label"]
) => <Mantine.MenuLabel {...props} />;
