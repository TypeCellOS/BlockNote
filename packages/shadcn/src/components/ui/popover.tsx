"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../../lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "bn:bg-popover bn:text-popover-foreground bn:data-[state=open]:animate-in bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=open]:fade-in-0 bn:data-[state=closed]:zoom-out-95 bn:data-[state=open]:zoom-in-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:z-50 bn:w-72 bn:origin-(--radix-popover-content-transform-origin) bn:rounded-md bn:border bn:p-4 bn:shadow-md bn:outline-hidden",
        className,
      )}
      {...props}
    />
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
