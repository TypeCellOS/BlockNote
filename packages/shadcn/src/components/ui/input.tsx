import * as React from "react";

import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "bn-flex bn-h-10 bn-w-full bn-rounded-md bn-border bn-border-input bn-bg-background bn-px-3 bn-py-2 bn-text-sm bn-ring-offset-background file:bn-border-0 file:bn-bg-transparent file:bn-text-sm file:bn-font-medium placeholder:bn-text-muted-foreground focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-cursor-not-allowed disabled:bn-opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
