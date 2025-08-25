import * as React from "react"

import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bn:file:text-foreground bn:placeholder:text-muted-foreground bn:selection:bg-primary bn:selection:text-primary-foreground bn:dark:bg-input/30 bn:border-input bn:flex bn:h-9 bn:w-full bn:min-w-0 bn:rounded-md bn:border bn:bg-transparent bn:px-3 bn:py-1 bn:text-base bn:shadow-xs bn:transition-[color,box-shadow] bn:outline-none bn:file:inline-flex bn:file:h-7 bn:file:border-0 bn:file:bg-transparent bn:file:text-sm bn:file:font-medium bn:disabled:pointer-events-none bn:disabled:cursor-not-allowed bn:disabled:opacity-50 bn:md:text-sm",
        "bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:focus-visible:ring-[3px]",
        "bn:aria-invalid:ring-destructive/20 bn:dark:aria-invalid:ring-destructive/40 bn:aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
