import { cn } from "../../lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bn:bg-accent bn:animate-pulse bn:rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
