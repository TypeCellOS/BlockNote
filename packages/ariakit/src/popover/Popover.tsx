import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Popover"]["Trigger"]
>((props, ref) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <Ariakit.PopoverDisclosure render={children as any} ref={ref} />;
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children, variant, ...rest } = props;

  assertEmpty(rest);

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
  const { children, opened, position, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.PopoverProvider open={opened} placement={position}>
      {children}
    </Ariakit.PopoverProvider>
  );
};
