import * as Mantine from "@mantine/core";

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
      onTriggerMouseOver: () => void;
      onTriggerMouseLeave: () => void;
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
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Root"]
>((props, ref) => {
  const {
    children,
    onOpenChange,
    position,
    // sub
  } = props;
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
      <Mantine.Menu.Item
        className="bn-menu-item bn-mt-sub-menu-item"
        ref={ref}
        component="div"
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
  const { children, onOpenChange, position, sub } = props;

  if (sub) {
    return <SubMenu {...props} />;
  }

  return (
    <Mantine.Menu
      width={100}
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
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Item"]
>((props, ref) => {
  const { className, children, icon, checked, subTrigger, onClick, ...rest } =
    props;

  const ctx = useContext(SubMenuContext);

  if (subTrigger) {
    return (
      <div ref={ref} {...rest}>
        {children}
        <HiChevronRight size={15} />
      </div>
    );
  }

  const onMouseLeave = subTrigger ? ctx!.onTriggerMouseLeave : undefined;
  const onMouseOver = subTrigger ? ctx!.onTriggerMouseOver : undefined;

  return (
    <Mantine.Menu.Item
      className={className}
      ref={ref}
      component="div"
      leftSection={icon}
      rightSection={
        checked ? (
          <Mantine.CheckIcon size={10} />
        ) : checked === false ? (
          <div className={"bn-tick-space"} />
        ) : null
      }
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
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
    // sub
  } = props;

  return <Mantine.Menu.Target>{children}</Mantine.Menu.Target>;
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Dropdown"]
>((props, ref) => {
  const { className, children, sub } = props;

  const ctx = useContext(SubMenuContext);

  return (
    <Mantine.Menu.Dropdown
      className={className}
      ref={ref}
      onMouseOver={ctx?.onMenuMouseOver}
      onMouseLeave={ctx?.onMenuMouseLeave}
      style={sub ? { marginLeft: "5px" } : {}} // TODO: Needed?
    >
      {children}
    </Mantine.Menu.Dropdown>
  );
});

export const MenuDivider = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className } = props;

  return <Mantine.Menu.Divider className={className} ref={ref} />;
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Mantine.Menu.Label className={className} ref={ref}>
      {children}
    </Mantine.Menu.Label>
  );
});
