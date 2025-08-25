import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "bn:inline-flex bn:items-center bn:justify-center bn:gap-2 bn:whitespace-nowrap bn:rounded-md bn:text-sm bn:font-medium bn:transition-all bn:disabled:pointer-events-none bn:disabled:opacity-50 bn:[&_svg]:pointer-events-none bn:[&_svg:not([class*=size-])]:size-4 bn:shrink-0 bn:[&_svg]:shrink-0 bn:outline-none bn:focus-visible:border-ring bn:focus-visible:ring-ring/50 bn:focus-visible:ring-[3px] bn:aria-invalid:ring-destructive/20 bn:dark:aria-invalid:ring-destructive/40 bn:aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bn:bg-primary bn:text-primary-foreground bn:shadow-xs bn:hover:bg-primary/90",
        destructive:
          "bn:bg-destructive bn:text-white bn:shadow-xs bn:hover:bg-destructive/90 bn:focus-visible:ring-destructive/20 bn:dark:focus-visible:ring-destructive/40 bn:dark:bg-destructive/60",
        outline:
          "bn:border bn:bg-background bn:shadow-xs bn:hover:bg-accent bn:hover:text-accent-foreground bn:dark:bg-input/30 bn:dark:border-input bn:dark:hover:bg-input/50",
        secondary:
          "bn:bg-secondary bn:text-secondary-foreground bn:shadow-xs bn:hover:bg-secondary/80",
        ghost:
          "bn:hover:bg-accent bn:hover:text-accent-foreground bn:dark:hover:bg-accent/50",
        link: "bn:text-primary bn:underline-offset-4 bn:hover:underline",
      },
      size: {
        default: "bn:h-9 bn:px-4 bn:py-2 bn:has-[>svg]:px-3",
        sm: "bn:h-8 bn:rounded-md bn:gap-1.5 bn:px-3 bn:has-[>svg]:px-2.5",
        lg: "bn:h-10 bn:rounded-md bn:px-6 bn:has-[>svg]:px-4",
        icon: "bn:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
