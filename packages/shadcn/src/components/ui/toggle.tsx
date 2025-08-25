import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const toggleVariants = cva(
  "bn:inline-flex bn:items-center bn:justify-center bn:gap-2 bn:rounded-md bn:text-sm bn:font-medium bn:hover:bg-muted bn:hover:text-muted-foreground bn:disabled:pointer-events-none bn:disabled:opacity-50 bn:data-[state=on]:bg-accent bn:data-[state=on]:text-accent-foreground bn:[&_svg]:pointer-events-none bn:[&_svg:not([class*=size-])]:size-4 bn:[&_svg]:shrink-0 bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:focus-visible:ring-[3px] bn:outline-none bn:transition-[color,box-shadow] bn:aria-invalid:ring-destructive/20 bn:dark:aria-invalid:ring-destructive/40 bn:aria-invalid:border-destructive bn:whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bn:bg-transparent",
        outline:
          "bn:border bn:border-input bn:bg-transparent bn:shadow-xs bn:hover:bg-accent bn:hover:text-accent-foreground",
      },
      size: {
        default: "bn:h-9 bn:px-2 bn:min-w-9",
        sm: "bn:h-8 bn:px-1.5 bn:min-w-8",
        lg: "bn:h-10 bn:px-2.5 bn:min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
