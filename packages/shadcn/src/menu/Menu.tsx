import { assertEmpty } from "@blocknote/core";
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import { createContext, forwardRef, ReactElement, useContext } from "react";
import { preventFocusOnOpenProps } from "../lib/preventFocusOnOpen.js";
import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

// Hands the `portalElement` and `preventFocusOnOpen` props from `Menu` (the
// root) down to `MenuDropdown`, where the dropdown's `container` is set.
const MenuRootPropsContext = createContext<{
  portalElement: HTMLElement | null;
  preventFocusOnOpen: boolean;
}>({ portalElement: null, preventFocusOnOpen: false });

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position: _position, // Unused
    portalElement,
    // Base UI has no `initialFocus` on Menu; see lib/preventFocusOnOpen.ts.
    preventFocusOnOpen,
    sub,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  const rootProps = {
    portalElement,
    preventFocusOnOpen: preventFocusOnOpen ?? false,
  };

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSub
        onOpenChange={onOpenChange}
      >
        <MenuRootPropsContext.Provider value={rootProps}>
          {children}
        </MenuRootPropsContext.Provider>
      </ShadCNComponents.DropdownMenu.DropdownMenuSub>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenu
        modal={false}
        onOpenChange={onOpenChange}
      >
        <MenuRootPropsContext.Provider value={rootProps}>
          {children}
        </MenuRootPropsContext.Provider>
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

  // The `portalElement` supplied at the call site is a themed `.bn-root`, so the
  // menu inherits light/dark mode instead of the document body's.
  // `null` (editor not mounted yet) makes Base UI wait for a container
  // instead of falling back to the body; nothing is open at that point.
  const { portalElement: container, preventFocusOnOpen } =
    useContext(MenuRootPropsContext);

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
        // How-to-test: without it, opening the colors menu from the mobile toolbar focuses the menu, which closes the keyboard and the toolbar with it (covered by skinFocus, android, shadcn: "opening the colors menu keeps focus in the editor").
        {...preventFocusOnOpenProps(preventFocusOnOpen)}
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
        // How-to-test: without the tap guard (here and on the plain item below), tapping a color focuses the item and closes the keyboard (covered by skinFocus, android, shadcn: "picking from the colors menu leaves focus in the editor").
        onMouseDown={preventFocusOnTap}
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
      onMouseDown={preventFocusOnTap}
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
