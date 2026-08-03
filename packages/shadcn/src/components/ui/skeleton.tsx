// Manual change from the shadcn CLI output: relative import instead of the
// CLI's "@/lib/utils" alias (not resolvable when consumed from source).
import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
