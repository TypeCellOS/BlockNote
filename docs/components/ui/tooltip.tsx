"use client";

import { cn } from "@/lib/fumadocs/cn";
import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import * as React from "react";

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const Tooltip = Primitive.Root;

const TooltipTrigger = Primitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  React.ComponentPropsWithoutRef<typeof Primitive.Popup> &
    Pick<Primitive.Positioner.Props, "sideOffset" | "align">
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Positioner
      align={align}
      side="top"
      sideOffset={sideOffset}
      className="z-50"
    >
      <Primitive.Popup
        ref={ref}
        className={(s) =>
          cn(
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-md",
            typeof className === "function" ? className(s) : className,
          )
        }
        {...props}
      />
    </Primitive.Positioner>
  </Primitive.Portal>
));
TooltipContent.displayName = Primitive.Popup.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
