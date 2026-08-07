import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useBlockNoteEditor } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import { forwardRef, ReactElement } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position: _position, // Unused
    sub,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSub
        onOpenChange={onOpenChange}
      >
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSub>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenu
        modal={false}
        onOpenChange={onOpenChange}
      >
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenu>
    );
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"],
) => {
  const { children, sub, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSubTrigger>
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSubTrigger>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuTrigger
        render={children as ReactElement}
      />
    );
  }
};

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Dropdown"]
>((props, ref) => {
  const { className, children, sub, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  // Portal into the editor's portal element (which carries the color-scheme
  // class) so the menu inherits light/dark mode instead of the document body's.
  const editor = useBlockNoteEditor();
  const container = editor.portalElement;

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSubContent
        className={className}
        container={container}
        ref={ref}
      >
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSubContent>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuContent
        className={className}
        container={container}
        ref={ref}
      >
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuContent>
    );
  }
});

export const MenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Item"]
>((props, ref) => {
  const { className, children, icon, checked, subTrigger, onClick, ...rest } =
    props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

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
      <ShadCNComponents.DropdownMenu.DropdownMenuCheckboxItem
        className={cn(className, "gap-1", checked ? "" : "px-2")}
        ref={ref}
        checked={checked}
        onClick={onClick}
        {...rest}
      >
        {icon}
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuCheckboxItem>
    );
  }

  return (
    <ShadCNComponents.DropdownMenu.DropdownMenuItem
      className={className}
      ref={ref}
      onClick={onClick}
      {...rest}
    >
      {icon}
      {children}
      {subTrigger && <ChevronRight className="ml-auto h-4 w-4" />}
    </ShadCNComponents.DropdownMenu.DropdownMenuItem>
  );
});

export const MenuDivider = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Divider"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.DropdownMenu.DropdownMenuSeparator
      className={className}
      ref={ref}
    />
  );
});

export const MenuLabel = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Menu"]["Label"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.DropdownMenu.DropdownMenuGroup>
      <ShadCNComponents.DropdownMenu.DropdownMenuLabel
        className={className}
        ref={ref}
      >
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuLabel>
    </ShadCNComponents.DropdownMenu.DropdownMenuGroup>
  );
});
