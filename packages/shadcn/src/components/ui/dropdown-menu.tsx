"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "../../lib/utils";

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Content
      data-slot="dropdown-menu-content"
      sideOffset={sideOffset}
      className={cn(
        "bn:bg-popover bn:text-popover-foreground bn:data-[state=open]:animate-in bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=open]:fade-in-0 bn:data-[state=closed]:zoom-out-95 bn:data-[state=open]:zoom-in-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:z-50 bn:max-h-(--radix-dropdown-menu-content-available-height) bn:min-w-[8rem] bn:origin-(--radix-dropdown-menu-content-transform-origin) bn:overflow-x-hidden bn:overflow-y-auto bn:rounded-md bn:border bn:p-1 bn:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:data-[variant=destructive]:text-destructive bn:data-[variant=destructive]:focus:bg-destructive/10 bn:dark:data-[variant=destructive]:focus:bg-destructive/20 bn:data-[variant=destructive]:focus:text-destructive bn:data-[variant=destructive]:*:[svg]:!text-destructive bn:[&_svg:not([class*=text-])]:text-muted-foreground bn:relative bn:flex bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:px-2 bn:py-1.5 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:data-[inset]:pl-8 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:relative bn:flex bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:py-1.5 bn:pr-2 bn:pl-8 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="bn:pointer-events-none bn:absolute bn:left-2 bn:flex bn:size-3.5 bn:items-center bn:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="bn:size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:relative bn:flex bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:py-1.5 bn:pr-2 bn:pl-8 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="bn:pointer-events-none bn:absolute bn:left-2 bn:flex bn:size-3.5 bn:items-center bn:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="bn:size-2 bn:fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "bn:px-2 bn:py-1.5 bn:text-sm bn:font-medium bn:data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bn:bg-border bn:-mx-1 bn:my-1 bn:h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "bn:text-muted-foreground bn:ml-auto bn:text-xs bn:tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:data-[state=open]:bg-accent bn:data-[state=open]:text-accent-foreground bn:flex bn:cursor-default bn:items-center bn:rounded-sm bn:px-2 bn:py-1.5 bn:text-sm bn:outline-hidden bn:select-none bn:data-[inset]:pl-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="bn:ml-auto bn:size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bn:bg-popover bn:text-popover-foreground bn:data-[state=open]:animate-in bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=open]:fade-in-0 bn:data-[state=closed]:zoom-out-95 bn:data-[state=open]:zoom-in-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:z-50 bn:min-w-[8rem] bn:origin-(--radix-dropdown-menu-content-transform-origin) bn:overflow-hidden bn:rounded-md bn:border bn:p-1 bn:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
