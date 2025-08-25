import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../../lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        "bn:bg-primary bn:text-primary-foreground bn:animate-in bn:fade-in-0 bn:zoom-in-95 bn:data-[state=closed]:animate-out bn:data-[state=closed]:fade-out-0 bn:data-[state=closed]:zoom-out-95 bn:data-[side=bottom]:slide-in-from-top-2 bn:data-[side=left]:slide-in-from-right-2 bn:data-[side=right]:slide-in-from-left-2 bn:data-[side=top]:slide-in-from-bottom-2 bn:z-50 bn:w-fit bn:origin-(--radix-tooltip-content-transform-origin) bn:rounded-md bn:px-3 bn:py-1.5 bn:text-xs bn:text-balance",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="bn:bg-primary bn:fill-primary bn:z-50 bn:size-2.5 bn:translate-y-[calc(-50%_-_2px)] bn:rotate-45 bn:rounded-[2px]" />
    </TooltipPrimitive.Content>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
