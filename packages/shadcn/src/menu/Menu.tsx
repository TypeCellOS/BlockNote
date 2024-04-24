import * as ShadCNDropdownMenu from "../components/ui/dropdown-menu";

import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    // position,
    sub,
  } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenu =
    ShadCNComponents?.DropdownMenu || ShadCNDropdownMenu.DropdownMenu;
  const DropdownMenuSub =
    ShadCNComponents?.DropdownMenuSub || ShadCNDropdownMenu.DropdownMenuSub;

  if (sub) {
    return (
      <DropdownMenuSub onOpenChange={onOpenChange}>{children}</DropdownMenuSub>
    );
  } else {
    return <DropdownMenu onOpenChange={onOpenChange}>{children}</DropdownMenu>;
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { children, sub } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenuSubTrigger =
    ShadCNComponents?.DropdownMenuSubTrigger ||
    ShadCNDropdownMenu.DropdownMenuSubTrigger;
  const DropdownMenuTrigger =
    ShadCNComponents?.DropdownMenuTrigger ||
    ShadCNDropdownMenu.DropdownMenuTrigger;

  if (sub) {
    return <DropdownMenuSubTrigger>{children}</DropdownMenuSubTrigger>;
  } else {
    return <DropdownMenuTrigger asChild={true}>{children}</DropdownMenuTrigger>;
  }
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Dropdown"]
>((props, ref) => {
  const { className, children, sub } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenuContent =
    ShadCNComponents?.DropdownMenuContent ||
    ShadCNDropdownMenu.DropdownMenuContent;
  const DropdownMenuSubContent =
    ShadCNComponents?.DropdownMenuSubContent ||
    ShadCNDropdownMenu.DropdownMenuSubContent;

  if (sub) {
    return (
      <DropdownMenuSubContent className={className} ref={ref}>
        {children}
      </DropdownMenuSubContent>
    );
  } else {
    return (
      <DropdownMenuContent className={className} ref={ref}>
        {children}
      </DropdownMenuContent>
    );
  }
});

export const MenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Item"]
>((props, ref) => {
  const { className, children, icon, checked, subTrigger, onClick, ...rest } =
    props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenuCheckboxItem =
    ShadCNComponents?.DropdownMenuCheckboxItem ||
    ShadCNDropdownMenu.DropdownMenuCheckboxItem;
  const DropdownMenuItem =
    ShadCNComponents?.DropdownMenuItem || ShadCNDropdownMenu.DropdownMenuItem;

  if (subTrigger) {
    return (
      <>
        {icon}
        {children}
      </>
    );
  }

  if (checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem
        className={cn(className, "gap-1")}
        ref={ref}
        checked={checked}
        onClick={onClick}
        {...rest}>
        {icon}
        {children}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem
      className={className}
      ref={ref}
      onClick={onClick}
      {...rest}>
      {icon}
      {children}
      {subTrigger && <ChevronRight className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
  );
});

export const MenuDivider = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenuSeparator =
    ShadCNComponents?.DropdownMenuSeparator ||
    ShadCNDropdownMenu.DropdownMenuSeparator;

  return <DropdownMenuSeparator className={className} ref={ref} />;
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const DropdownMenuLabel =
    ShadCNComponents?.DropdownMenuLabel || ShadCNDropdownMenu.DropdownMenuLabel;

  return (
    <DropdownMenuLabel className={className} ref={ref}>
      {children}
    </DropdownMenuLabel>
  );
});
