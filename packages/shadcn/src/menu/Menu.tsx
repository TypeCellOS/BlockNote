import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import { forwardRef, useMemo } from "react";

import type { DropdownMenuTrigger as ShadCNDropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { cn } from "../lib/utils";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

// hacky HoC to change DropdownMenuTrigger to open a menu on PointerUp instead of PointerDown
// Needed to fix this issue: https://github.com/radix-ui/primitives/issues/2867
const MenuTriggerWithPointerUp = (Comp: typeof ShadCNDropdownMenuTrigger) =>
  forwardRef<any, React.ComponentProps<typeof ShadCNDropdownMenuTrigger>>(
    (props, ref) => {
      return (
        <Comp
          onPointerDown={(e) => {
            if (!(e.nativeEvent as any).fakeEvent) {
              // setting ctrlKey will block the menu from opening
              // as it will block this line: https://github.com/radix-ui/primitives/blob/b32a93318cdfce383c2eec095710d35ffbd33a1c/packages/react/dropdown-menu/src/DropdownMenu.tsx#L120
              e.ctrlKey = true;
            }
          }}
          onPointerUp={(event) => {
            // dispatch a pointerdown event so the Radix pointer down handler gets called that opens the menu
            const e = new PointerEvent("pointerdown", event.nativeEvent);
            (e as any).fakeEvent = true;
            event.target.dispatchEvent(e);
          }}
          {...props}
          ref={ref}
        />
      );
    }
  );

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const {
    children,
    onOpenChange,
    position, // Unused
    sub,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSub
        onOpenChange={onOpenChange}>
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSub>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenu onOpenChange={onOpenChange}>
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenu>
    );
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { children, sub, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  const DropdownMenuTrigger = useMemo(
    () =>
      MenuTriggerWithPointerUp(
        ShadCNComponents.DropdownMenu.DropdownMenuTrigger
      ),
    [ShadCNComponents.DropdownMenu.DropdownMenuTrigger]
  );

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSubTrigger>
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSubTrigger>
    );
  } else {
    return (
      <DropdownMenuTrigger asChild={true} {...rest}>
        {children}
      </DropdownMenuTrigger>
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

  if (sub) {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuSubContent
        className={className}
        ref={ref}>
        {children}
      </ShadCNComponents.DropdownMenu.DropdownMenuSubContent>
    );
  } else {
    return (
      <ShadCNComponents.DropdownMenu.DropdownMenuContent
        className={className}
        ref={ref}>
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
        className={cn(className, "bn-gap-1")}
        ref={ref}
        checked={checked}
        onClick={onClick}
        {...rest}>
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
      {...rest}>
      {icon}
      {children}
      {subTrigger && <ChevronRight className="bn-ml-auto bn-h-4 bn-w-4" />}
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
    <ShadCNComponents.DropdownMenu.DropdownMenuLabel
      className={className}
      ref={ref}>
      {children}
    </ShadCNComponents.DropdownMenu.DropdownMenuLabel>
  );
});
