import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { children, opened, position } = props;

  return (
    <Mantine.Popover
      withinPortal={false}
      zIndex={10000}
      opened={opened}
      position={position}>
      {children}
    </Mantine.Popover>
  );
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => {
  const { children } = props;

  return <Mantine.PopoverTarget>{children}</Mantine.PopoverTarget>;
};

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const { className, children } = props;

  return (
    <Mantine.PopoverDropdown className={className} ref={ref}>
      {children}
    </Mantine.PopoverDropdown>
  );
});
