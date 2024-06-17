import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const toggleVariants = cva(
  "bn-inline-flex bn-items-center bn-justify-center bn-rounded-md bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-colors hover:bn-bg-muted hover:bn-text-muted-foreground focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50 data-[state=on]:bn-bg-accent data-[state=on]:bn-text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bn-bg-transparent",
        outline:
          "bn-border bn-border-input bn-bg-transparent hover:bn-bg-accent hover:bn-text-accent-foreground",
      },
      size: {
        default: "bn-h-10 bn-px-3",
        sm: "bn-h-9 bn-px-2.5",
        lg: "bn-h-11 bn-px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
