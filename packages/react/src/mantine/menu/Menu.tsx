import * as mantine from "@mantine/core";
import { HTMLAttributes } from "react";
import { HiChevronRight } from "react-icons/hi";
import { MenuItemProps, MenuProps } from "../../editor/ComponentsContext";
export { MenuLabel, MenuTarget } from "@mantine/core";

export const Menu = (props: MenuProps) => {
  const { onOpenChange, open, defaultOpen, ...rest } = props;

  return (
    <mantine.Menu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      opened={open}
      defaultOpened={defaultOpen}
      closeOnItemClick={false}
      {...rest}
      position="right"
    />
  );
};

export const MenuItem = (props: MenuItemProps) => {
  const { icon, checked, expandArrow, ...rest } = props;

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
      {...rest}
    />
  );
};

export const MenuDropdown = (props: HTMLAttributes<HTMLDivElement>) => {
  return <mantine.MenuDropdown {...props} />;
};
export const MenuDivider = () => {
  return <mantine.MenuDivider />;
};
