import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => {
  const { children, ...rest } = props;

  return (
    <Ariakit.PopoverDisclosure
      {...rest}
      render={children as any}></Ariakit.PopoverDisclosure>
  );
};

export const PopoverContent = (
  props: ComponentProps["Generic"]["Popover"]["Content"]
) => <Ariakit.Popover {...props} />;

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => <Ariakit.PopoverProvider {...props} />;
