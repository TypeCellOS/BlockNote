import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "bn:inline-flex bn:items-center bn:justify-center bn:rounded-md bn:border bn:px-2 bn:py-0.5 bn:text-xs bn:font-medium bn:w-fit bn:whitespace-nowrap bn:shrink-0 bn:[&>svg]:size-3 bn:gap-1 bn:[&>svg]:pointer-events-none bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:focus-visible:ring-[3px] bn:aria-invalid:ring-destructive/20 bn:dark:aria-invalid:ring-destructive/40 bn:aria-invalid:border-destructive bn:transition-[color,box-shadow] bn:overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bn:border-transparent bn:bg-primary bn:text-primary-foreground bn:[a&]:hover:bg-primary/90",
        secondary:
          "bn:border-transparent bn:bg-secondary bn:text-secondary-foreground bn:[a&]:hover:bg-secondary/90",
        destructive:
          "bn:border-transparent bn:bg-destructive bn:text-white bn:[a&]:hover:bg-destructive/90 bn:focus-visible:ring-destructive/20 bn:dark:focus-visible:ring-destructive/40 bn:dark:bg-destructive/60",
        outline:
          "bn:text-foreground bn:[a&]:hover:bg-accent bn:[a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
