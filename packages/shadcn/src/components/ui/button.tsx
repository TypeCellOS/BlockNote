import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "bn-inline-flex bn-items-center bn-justify-center bn-whitespace-nowrap bn-rounded-md bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-colors focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50",
  {
    variants: {
      variant: {
        default:
          "bn-bg-primary bn-text-primary-foreground hover:bn-bg-primary/90",
        destructive:
          "bn-bg-destructive bn-text-destructive-foreground hover:bn-bg-destructive/90",
        outline:
          "bn-border bn-border-input bn-bg-background hover:bn-bg-accent hover:bn-text-accent-foreground",
        secondary:
          "bn-bg-secondary bn-text-secondary-foreground hover:bn-bg-secondary/80",
        ghost: "hover:bn-bg-accent hover:bn-text-accent-foreground",
        link: "bn-text-primary bn-underline-offset-4 hover:bn-underline",
      },
      size: {
        default: "bn-h-10 bn-px-4 bn-py-2",
        sm: "bn-h-9 bn-rounded-md bn-px-3",
        lg: "bn-h-11 bn-rounded-md bn-px-8",
        icon: "bn-h-10 bn-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
