import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "../../lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "bn:border-input bn:data-[placeholder]:text-muted-foreground bn:[&_svg:not([class*=text-])]:text-muted-foreground bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:aria-invalid:ring-destructive/20 bn:dark:aria-invalid:ring-destructive/40 bn:aria-invalid:border-destructive bn:dark:bg-input/30 bn:dark:hover:bg-input/50 bn:flex bn:w-fit bn:items-center bn:justify-between bn:gap-2 bn:rounded-md bn:border bn:bg-transparent bn:px-3 bn:py-2 bn:text-sm bn:whitespace-nowrap bn:shadow-xs bn:transition-[color,box-shadow] bn:outline-none bn:focus-visible:ring-[3px] bn:disabled:cursor-not-allowed bn:disabled:opacity-50 bn:data-[size=default]:h-9 bn:data-[size=sm]:h-8 bn:*:data-[slot=select-value]:line-clamp-1 bn:*:data-[slot=select-value]:flex bn:*:data-[slot=select-value]:items-center bn:*:data-[slot=select-value]:gap-2 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="bn:size-4 bn:opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Content
      data-slot="select-content"
      className={cn(
        "bn:bg-popover bn:text-popover-foreground bn:data-[state=open]:animate-in bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=open]:fade-in-0 bn:data-[state=closed]:zoom-out-95 bn:data-[state=open]:zoom-in-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:relative bn:z-50 bn:max-h-(--radix-select-content-available-height) bn:min-w-[8rem] bn:origin-(--radix-select-content-transform-origin) bn:overflow-x-hidden bn:overflow-y-auto bn:rounded-md bn:border bn:shadow-md",
        position === "popper" &&
          "bn:data-[side=bottom]:translate-y-1 bn:data-[side=left]:-translate-x-1 bn:data-[side=right]:translate-x-1 bn:data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "bn:p-1",
          position === "popper" &&
            "bn:h-[var(--radix-select-trigger-height)] bn:w-full bn:min-w-[var(--radix-select-trigger-width)] bn:scroll-my-1",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "bn:text-muted-foreground bn:px-2 bn:py-1.5 bn:text-xs",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "bn:focus:bg-accent bn:focus:text-accent-foreground bn:[&_svg:not([class*=text-])]:text-muted-foreground bn:relative bn:flex bn:w-full bn:cursor-default bn:items-center bn:gap-2 bn:rounded-sm bn:py-1.5 bn:pr-8 bn:pl-2 bn:text-sm bn:outline-hidden bn:select-none bn:data-[disabled]:pointer-events-none bn:data-[disabled]:opacity-50 bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4 bn:*:[span]:last:flex bn:*:[span]:last:items-center bn:*:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="bn:absolute bn:right-2 bn:flex bn:size-3.5 bn:items-center bn:justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="bn:size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "bn:bg-border bn:pointer-events-none bn:-mx-1 bn:my-1 bn:h-px",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "bn:flex bn:cursor-default bn:items-center bn:justify-center bn:py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="bn:size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "bn:flex bn:cursor-default bn:items-center bn:justify-center bn:py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="bn:size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
