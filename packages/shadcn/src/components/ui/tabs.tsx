"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("bn:flex bn:flex-col bn:gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bn:bg-muted bn:text-muted-foreground bn:inline-flex bn:h-9 bn:w-fit bn:items-center bn:justify-center bn:rounded-lg bn:p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "bn:data-[state=active]:bg-background bn:dark:data-[state=active]:text-foreground bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:focus-visible:outline-ring bn:dark:data-[state=active]:border-input bn:dark:data-[state=active]:bg-input/30 bn:text-foreground bn:dark:text-muted-foreground bn:inline-flex bn:h-[calc(100%-1px)] bn:flex-1 bn:items-center bn:justify-center bn:gap-1.5 bn:rounded-md bn:border bn:border-transparent bn:px-2 bn:py-1 bn:text-sm bn:font-medium bn:whitespace-nowrap bn:transition-[color,box-shadow] bn:focus-visible:ring-[3px] bn:focus-visible:outline-1 bn:disabled:pointer-events-none bn:disabled:opacity-50 bn:data-[state=active]:shadow-sm bn:[&_svg]:pointer-events-none bn:[&_svg]:shrink-0 bn:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("bn:flex-1 bn:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
