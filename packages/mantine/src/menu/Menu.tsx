import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { HiChevronRight } from "react-icons/hi";

const SubMenuContext = createContext<
  | {
      onMenuMouseOver: () => void;
      onMenuMouseLeave: () => void;
    }
  | undefined
>(undefined);

// https://github.com/orgs/mantinedev/discussions/2307
// Mantine does not officially support sub menus, so we have to use a workaround
// which uses an unconventional nesting structure:
//
//  Conventional nesting structure (used by Ariakit/ShadCN):
// <Menu>
//   <MenuTrigger>
//     <MenuItem>Find</MenuItem>
//   </MenuTrigger>
//   <MenuDropdown>
//     <MenuItem>Undo</MenuItem>
//     <MenuItem>Redo</MenuItem>
//     <Menu>
//       <MenuTrigger>
//         <MenuItem>Find</MenuItem>
//       </MenuTrigger>
//       <MenuDropdown>
//         <MenuItem>Find Next</MenuItem>
//         <MenuItem>Find Previous</MenuItem>
//       </MenuDropdown>
//     </Menu>
//   </MenuDropdown>
// </Menu>
//
//  Required structure for Mantine:
// <Menu>
//   <MenuTrigger>
//       <MenuItem>Find</MenuItem>
//   </MenuTrigger>
//   <MenuDropdown>
//     <MenuItem>Undo</MenuItem>
//     <MenuItem>Redo</MenuItem>
//     <MenuItem>
//       <Menu>
//         <MenuTrigger>
//             <div>Find</div>
//         </MenuTrigger>
//         <MenuDropdown>
//           <MenuItem>Find Next</MenuItem>
//           <MenuItem>Find Previous</MenuItem>
//         </MenuDropdown>
//       </Menu>
//     </MenuItem>
//   </MenuDropdown>
// </Menu>
const SubMenu = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Menu"]["Root"]
>((props, ref) => {
  const {
    children,
    onOpenChange,
    position,
    sub, // not used
    ...rest
  } = props;

  assertEmpty(rest);

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
        onMenuMouseOver: mouseOver,
        onMenuMouseLeave: mouseLeave,
      }}>
      <Mantine.Menu.Item
        className="bn-menu-item bn-mt-sub-menu-item"
        ref={ref}
        onMouseOver={mouseOver}
        onMouseLeave={mouseLeave}>
        <Mantine.Menu
          withinPortal={false}
          middlewares={{ flip: true, shift: true, inline: false, size: true }}
          trigger={"hover"}
          opened={opened}
          onClose={() => onOpenChange?.(false)}
          onOpen={() => onOpenChange?.(true)}
          position={position}>
          {children}
        </Mantine.Menu>
      </Mantine.Menu.Item>
    </SubMenuContext.Provider>
  );
});

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { children, onOpenChange, position, sub, ...rest } = props;

  assertEmpty(rest);

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
      <div ref={ref} {...rest}>
        {children}
        <HiChevronRight size={15} />
      </div>
    );
  }

  return (
    <Mantine.Menu.Item
      className={className}
      ref={ref}
      leftSection={icon}
      rightSection={
        checked ? (
          <Mantine.CheckIcon size={10} />
        ) : checked === false ? (
          <div className={"bn-tick-space"} />
        ) : null
      }
      onClick={onClick}
      {...rest}>
      {children}
    </Mantine.Menu.Item>
  );
});

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const {
    children,
    sub, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return <Mantine.Menu.Target>{children}</Mantine.Menu.Target>;
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

  return (
    <Mantine.Menu.Dropdown
      className={className}
      ref={ref}
      onMouseOver={ctx?.onMenuMouseOver}
      onMouseLeave={ctx?.onMenuMouseLeave}>
      {children}
    </Mantine.Menu.Dropdown>
  );
});

export const MenuDivider = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return <Mantine.Menu.Divider className={className} ref={ref} />;
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Mantine.Menu.Label className={className} ref={ref}>
      {children}
    </Mantine.Menu.Label>
  );
});
