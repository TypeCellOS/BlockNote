import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Popover"]["Trigger"]
>((props, ref) => {
  const { children } = props;

  return (
    <Ariakit.PopoverDisclosure ref={ref}>{children}</Ariakit.PopoverDisclosure>
  );
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Ariakit.Popover
      className={mergeCSSClasses("bn-ak-popover", className || "")}
      ref={ref}>
      {children}
    </Ariakit.Popover>
  );
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { children, opened, position } = props;

  return (
    <Ariakit.PopoverProvider open={opened} placement={position}>
      {children}
    </Ariakit.PopoverProvider>
  );
};
