"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "../../lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "bn:flex bn:items-center bn:gap-2 bn:text-sm bn:leading-none bn:font-medium bn:select-none bn:group-data-[disabled=true]:pointer-events-none bn:group-data-[disabled=true]:opacity-50 bn:peer-disabled:cursor-not-allowed bn:peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
