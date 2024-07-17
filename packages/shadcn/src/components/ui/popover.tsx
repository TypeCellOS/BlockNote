import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../../lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  // <PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "bn-z-50 bn-w-72 bn-rounded-md bn-border bn-bg-popover bn-p-4 bn-text-popover-foreground bn-shadow-md bn-outline-none data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
  // </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
