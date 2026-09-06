import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import { createContext, forwardRef, ReactElement, useContext } from "react";
import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

const PortalRootContext = createContext<HTMLElement | null>(null);

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position: _position, // Unused
    portalRoot,
    // base-ui manages menu focus itself; unlike Mantine there is no focus to
    // suppress, so this is intentionally unused.
    preventFocusOnOpen: _preventFocusOnOpen,
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
        <PortalRootContext.Provider value={portalRoot}>
          {children}
        </PortalRootContext.Provider>
      </ShadCNComponents.DropdownMenu.DropdownMenuSub>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenu
        modal={false}
        onOpenChange={onOpenChange}
      >
        <PortalRootContext.Provider value={portalRoot}>
          {children}
        </PortalRootContext.Provider>
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

  // The `portalRoot` supplied at the call site is a themed `.bn-root`, so the
  // menu inherits light/dark mode instead of the document body's.
  // `null` (editor not mounted yet) makes Base UI wait for a container
  // instead of falling back to the body; nothing is open at that point.
  const container = useContext(PortalRootContext);

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
