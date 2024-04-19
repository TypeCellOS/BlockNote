import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import * as ShadCNDropdownMenu from "../components/ui/dropdown-menu";

export const Menu = (
  props: ComponentProps["Generic"]["Menu"]["Root"] &
    Partial<{
      DropdownMenu: typeof ShadCNDropdownMenu.DropdownMenu;
      DropdownMenuSub: typeof ShadCNDropdownMenu.DropdownMenuSub;
    }>
) => {
  const DropdownMenu = props.DropdownMenu || ShadCNDropdownMenu.DropdownMenu;
  const DropdownMenuSub =
    props.DropdownMenuSub || ShadCNDropdownMenu.DropdownMenuSub;

  const { sub, position, ...rest } = props;

  if (sub) {
    return <DropdownMenuSub {...rest} />;
  } else {
    // return <DropdownMenuDemo />;
    return <DropdownMenu {...rest} />;
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"] &
    Partial<{
      DropdownMenuSubTrigger: typeof ShadCNDropdownMenu.DropdownMenuSubTrigger;
      DropdownMenuTrigger: typeof ShadCNDropdownMenu.DropdownMenuTrigger;
    }>
) => {
  const DropdownMenuSubTrigger =
    props.DropdownMenuSubTrigger || ShadCNDropdownMenu.DropdownMenuSubTrigger;
  const DropdownMenuTrigger =
    props.DropdownMenuTrigger || ShadCNDropdownMenu.DropdownMenuTrigger;

  const { sub, ...rest } = props;

  if (sub) {
    return <DropdownMenuSubTrigger {...rest} />;
  } else {
    return <DropdownMenuTrigger {...rest} />;
  }
};

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"] &
    Partial<{
      DropdownMenuContent: typeof ShadCNDropdownMenu.DropdownMenuContent;
      DropdownMenuSubContent: typeof ShadCNDropdownMenu.DropdownMenuSubContent;
    }>
) => {
  const DropdownMenuContent =
    props.DropdownMenuContent || ShadCNDropdownMenu.DropdownMenuContent;
  const DropdownMenuSubContent =
    props.DropdownMenuSubContent || ShadCNDropdownMenu.DropdownMenuSubContent;

  const { sub, ...rest } = props;

  if (sub) {
    return <DropdownMenuSubContent {...rest} />;
  } else {
    return <DropdownMenuContent {...rest} />;
  }
};

export const MenuItem = (
  props: ComponentProps["Generic"]["Menu"]["Item"] &
    Partial<{
      DropdownMenuCheckboxItem: typeof ShadCNDropdownMenu.DropdownMenuCheckboxItem;
      DropdownMenuItem: typeof ShadCNDropdownMenu.DropdownMenuItem;
    }>
) => {
  const DropdownMenuCheckboxItem =
    props.DropdownMenuCheckboxItem ||
    ShadCNDropdownMenu.DropdownMenuCheckboxItem;
  const DropdownMenuItem =
    props.DropdownMenuItem || ShadCNDropdownMenu.DropdownMenuItem;

  // TODO: implement icon
  const { icon, children, ...rest } = props;

  if (props.checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem {...rest}>
        {props.icon}
        {props.children}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem {...rest}>
      {props.icon}
      {props.children}
      {props.subTrigger && <ChevronRight className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"] &
    Partial<{
      DropdownMenuSeparator: typeof ShadCNDropdownMenu.DropdownMenuSeparator;
    }>
) => {
  const DropdownMenuSeparator =
    props.DropdownMenuSeparator || ShadCNDropdownMenu.DropdownMenuSeparator;

  return <DropdownMenuSeparator {...props} />;
};

export const MenuLabel = (
  props: ComponentProps["Generic"]["Menu"]["Label"] &
    Partial<{
      DropdownMenuLabel: typeof ShadCNDropdownMenu.DropdownMenuLabel;
    }>
) => {
  const DropdownMenuLabel =
    props.DropdownMenuLabel || ShadCNDropdownMenu.DropdownMenuLabel;

  return <DropdownMenuLabel {...props} />;
};
