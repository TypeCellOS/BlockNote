import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "../../lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "bn-flex bn-h-10 bn-w-full bn-items-center bn-justify-between bn-rounded-md bn-border bn-border-input bn-bg-background bn-px-3 bn-py-2 bn-text-sm bn-ring-offset-background placeholder:bn-text-muted-foreground focus:bn-outline-none focus:bn-ring-2 focus:bn-ring-ring focus:bn-ring-offset-2 disabled:bn-cursor-not-allowed disabled:bn-opacity-50 [&>span]:bn-line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="bn-h-4 bn-w-4 bn-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "bn-flex bn-cursor-default bn-items-center bn-justify-center bn-py-1",
      className
    )}
    {...props}>
    <ChevronUp className="bn-h-4 bn-w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "bn-flex bn-cursor-default bn-items-center bn-justify-center bn-py-1",
      className
    )}
    {...props}>
    <ChevronDown className="bn-h-4 bn-w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  // <SelectPrimitive.Portal>
  <SelectPrimitive.Content
    ref={ref}
    className={cn(
      "bn-relative bn-z-50 bn-max-h-96 bn-min-w-[8rem] bn-overflow-hidden bn-rounded-md bn-border bn-bg-popover bn-text-popover-foreground bn-shadow-md data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
      position === "popper" &&
        "data-[side=bottom]:bn-translate-y-1 data-[side=left]:bn--translate-x-1 data-[side=right]:bn-translate-x-1 data-[side=top]:bn--translate-y-1",
      className
    )}
    position={position}
    {...props}>
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport
      className={cn(
        "bn-p-1",
        position === "popper" &&
          "bn-h-[var(--radix-select-trigger-height)] bn-w-full bn-min-w-[var(--radix-select-trigger-width)]"
      )}>
      {children}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
  // </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-font-semibold",
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "bn-relative bn-flex bn-w-full bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-outline-none focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
      className
    )}
    {...props}>
    <span className="bn-absolute bn-left-2 bn-flex bn-h-3.5 bn-w-3.5 bn-items-center bn-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="bn-h-4 bn-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("bn--mx-1 bn-my-1 bn-h-px bn-bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
