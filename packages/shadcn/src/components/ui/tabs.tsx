import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "bn-inline-flex bn-h-10 bn-items-center bn-justify-center bn-rounded-md bn-bg-muted bn-p-1 bn-text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "bn-inline-flex bn-items-center bn-justify-center bn-whitespace-nowrap bn-rounded-sm bn-px-3 bn-py-1.5 bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-all focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50 data-[state=active]:bn-bg-background data-[state=active]:bn-text-foreground data-[state=active]:bn-shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "bn-mt-2 bn-ring-offset-background focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
