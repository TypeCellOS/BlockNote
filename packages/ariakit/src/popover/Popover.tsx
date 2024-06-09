import {
  Popover as AriakitPopover,
  PopoverDisclosure as AriakitPopoverDisclosure,
  PopoverProvider as AriakitPopoverProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Popover"]["Trigger"]
>((props, ref) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <AriakitPopoverDisclosure render={children as any} ref={ref} />;
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children, variant, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitPopover
      className={mergeCSSClasses("bn-ak-popover", className || "")}
      ref={ref}>
      {children}
    </AriakitPopover>
  );
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { children, opened, position, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitPopoverProvider open={opened} placement={position}>
      {children}
    </AriakitPopoverProvider>
  );
};
