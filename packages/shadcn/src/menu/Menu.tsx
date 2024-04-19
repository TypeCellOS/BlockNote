import * as ShadCNDropdownMenu from "../components/ui/dropdown-menu";

import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";

export const Menu = (
  props: ComponentProps["Generic"]["Menu"]["Root"] &
    Partial<{
      DropdownMenu: typeof ShadCNDropdownMenu.DropdownMenu;
      DropdownMenuSub: typeof ShadCNDropdownMenu.DropdownMenuSub;
    }>
) => {
  const {
    children,
    onOpenChange,
    // position,
    sub,
  } = props;

  const DropdownMenu = props.DropdownMenu || ShadCNDropdownMenu.DropdownMenu;
  const DropdownMenuSub =
    props.DropdownMenuSub || ShadCNDropdownMenu.DropdownMenuSub;

  if (sub) {
    return (
      <DropdownMenuSub onOpenChange={onOpenChange}>{children}</DropdownMenuSub>
    );
  } else {
    return <DropdownMenu onOpenChange={onOpenChange}>{children}</DropdownMenu>;
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"] &
    Partial<{
      DropdownMenuSubTrigger: typeof ShadCNDropdownMenu.DropdownMenuSubTrigger;
      DropdownMenuTrigger: typeof ShadCNDropdownMenu.DropdownMenuTrigger;
    }>
) => {
  const { children, sub } = props;

  const DropdownMenuSubTrigger =
    props.DropdownMenuSubTrigger || ShadCNDropdownMenu.DropdownMenuSubTrigger;
  const DropdownMenuTrigger =
    props.DropdownMenuTrigger || ShadCNDropdownMenu.DropdownMenuTrigger;

  if (sub) {
    return <DropdownMenuSubTrigger>{children}</DropdownMenuSubTrigger>;
  } else {
    return <DropdownMenuTrigger>{children}</DropdownMenuTrigger>;
  }
};

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"] &
    Partial<{
      DropdownMenuContent: typeof ShadCNDropdownMenu.DropdownMenuContent;
      DropdownMenuSubContent: typeof ShadCNDropdownMenu.DropdownMenuSubContent;
    }>
) => {
  const { className, children, sub } = props;

  const DropdownMenuContent =
    props.DropdownMenuContent || ShadCNDropdownMenu.DropdownMenuContent;
  const DropdownMenuSubContent =
    props.DropdownMenuSubContent || ShadCNDropdownMenu.DropdownMenuSubContent;

  if (sub) {
    return (
      <DropdownMenuSubContent className={className}>
        {children}
      </DropdownMenuSubContent>
    );
  } else {
    return (
      <DropdownMenuContent className={className}>
        {children}
      </DropdownMenuContent>
    );
  }
};

export const MenuItem = (
  props: ComponentProps["Generic"]["Menu"]["Item"] &
    Partial<{
      DropdownMenuCheckboxItem: typeof ShadCNDropdownMenu.DropdownMenuCheckboxItem;
      DropdownMenuItem: typeof ShadCNDropdownMenu.DropdownMenuItem;
    }>
) => {
  const { className, children, icon, checked, subTrigger, onClick } = props;

  const DropdownMenuCheckboxItem =
    props.DropdownMenuCheckboxItem ||
    ShadCNDropdownMenu.DropdownMenuCheckboxItem;
  const DropdownMenuItem =
    props.DropdownMenuItem || ShadCNDropdownMenu.DropdownMenuItem;

  if (checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem
        className={className}
        checked={checked}
        onClick={onClick}>
        {icon}
        {children}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem className={className} onClick={onClick}>
      {icon}
      {children}
      {subTrigger && <ChevronRight className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"] &
    Partial<{
      DropdownMenuSeparator: typeof ShadCNDropdownMenu.DropdownMenuSeparator;
    }>
) => {
  const { className } = props;

  const DropdownMenuSeparator =
    props.DropdownMenuSeparator || ShadCNDropdownMenu.DropdownMenuSeparator;

  return <DropdownMenuSeparator className={className} />;
};

export const MenuLabel = (
  props: ComponentProps["Generic"]["Menu"]["Label"] &
    Partial<{
      DropdownMenuLabel: typeof ShadCNDropdownMenu.DropdownMenuLabel;
    }>
) => {
  const { className, children } = props;

  const DropdownMenuLabel =
    props.DropdownMenuLabel || ShadCNDropdownMenu.DropdownMenuLabel;

  return (
    <DropdownMenuLabel className={className}>{children}</DropdownMenuLabel>
  );
};
