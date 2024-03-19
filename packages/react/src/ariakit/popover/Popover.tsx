import * as Ariakit from "@ariakit/react";
import { mergeCSSClasses } from "@blocknote/core";
import { forwardRef, HTMLAttributes } from "react";
export {
  PopoverProvider as Popover,
  Popover as PopoverContent,
} from "@ariakit/react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.PopoverDisclosure
      {...rest}
      className={mergeCSSClasses("bn-menu-item", className || "")}
      ref={ref}
      render={children as any}></Ariakit.PopoverDisclosure>
  );
});
