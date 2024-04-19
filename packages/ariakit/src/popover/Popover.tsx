import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => {
  const { children } = props;

  return (
    <Ariakit.PopoverDisclosure
      render={children as any}></Ariakit.PopoverDisclosure>
  );
};

export const PopoverContent = (
  props: ComponentProps["Generic"]["Popover"]["Content"]
) => {
  const { className, children } = props;

  return (
    <Ariakit.Popover className={mergeCSSClasses("popover", className || "")}>
      {children}
    </Ariakit.Popover>
  );
};

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
