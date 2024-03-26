import {
  MenuDropdownProps,
  MenuItemProps,
  MenuProps,
  MenuTriggerProps,
} from "@blocknote/react";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../lib/utils";

export const Menu = React.forwardRef((props: MenuProps, ref) => {
  const { sub, position, ...rest } = props;

  if (sub) {
    return <DropdownMenuSub {...rest} ref={ref} />;
  } else {
    // return <DropdownMenuDemo />;
    return <DropdownMenu {...rest} ref={ref} />;
  }
});

export const MenuTrigger = React.forwardRef((props: MenuTriggerProps, ref) => {
  const { sub, ...rest } = props;

  if (sub) {
    return <DropdownMenuSubTrigger asChild {...rest} ref={ref} />;
  } else {
    return <DropdownMenuTrigger asChild {...rest} ref={ref} />;
  }
});

export const MenuDropdown = React.forwardRef(
  (props: MenuDropdownProps, ref) => {
    const { sub, position, ...rest } = props;

    if (sub) {
      return (
        <DropdownMenuSubContent
          className={cn("bn-ui-container", props.className)}
          {...rest}
          side={position}
          ref={ref}
        />
      );
    } else {
      return (
        <DropdownMenuContent
          className={cn("bn-ui-container", props.className)}
          {...rest}
          side={position}
          ref={ref}
        />
      );
    }
  }
);

export const MenuItem = React.forwardRef((props: MenuItemProps, ref) => {
  // TODO: implement icon
  const { icon, ...rest } = props;

  if (props.checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem {...rest} ref={ref}></DropdownMenuCheckboxItem>
    );
  }

  return <DropdownMenuItem {...rest} ref={ref} />;
});

export const MenuDivider = DropdownMenuSeparator;
export const MenuLabel = DropdownMenuLabel;
