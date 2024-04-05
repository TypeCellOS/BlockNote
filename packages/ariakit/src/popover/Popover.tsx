import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { forwardRef, HTMLAttributes } from "react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.PopoverDisclosure
      {...rest}
      className={mergeCSSClasses(className || "")}
      ref={ref}
      render={children as any}></Ariakit.PopoverDisclosure>
  );
});

export const PopoverContent = forwardRef<HTMLDivElement, Ariakit.PopoverProps>(
  (props, ref) => <Ariakit.Popover {...props} ref={ref} />
);

export const Popover = (props: Ariakit.PopoverProviderProps) => (
  <Ariakit.PopoverProvider {...props} />
);
