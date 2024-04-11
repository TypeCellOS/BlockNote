import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { children, ...rest } = props;

  return (
    <Mantine.Popover {...rest} withinPortal={false} zIndex={10000}>
      {children}
    </Mantine.Popover>
  );
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => <Mantine.PopoverTarget>{props.children}</Mantine.PopoverTarget>;

export const PopoverContent = (
  props: ComponentProps["Generic"]["Popover"]["Content"]
) => <Mantine.PopoverDropdown>{props.children}</Mantine.PopoverDropdown>;
