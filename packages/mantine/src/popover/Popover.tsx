import {
  Popover as MantinePopover,
  PopoverDropdown as MantinePopoverDropdown,
  PopoverTarget as MantinePopoverTarget,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { createContext, forwardRef, useState } from "react";

export const PopoverContext = createContext<{
  isOpened: boolean;
}>({
  isOpened: false,
});

export const Popover = (
  props: ComponentProps["Generic"]["Popover"]["Root"]
) => {
  const { opened, onOpenChange, position, children, ...rest } = props;

  assertEmpty(rest);

  const [isOpened, setIsOpened] = useState(false);

  return (
    <PopoverContext.Provider value={{ isOpened }}>
      <MantinePopover
        withinPortal={false}
        opened={opened}
        onChange={(open) => {
          setIsOpened(open);
          onOpenChange?.(open);
        }}
        position={position}>
        {children}
      </MantinePopover>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = (
  props: ComponentProps["Generic"]["Popover"]["Trigger"]
) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <MantinePopoverTarget>{children}</MantinePopoverTarget>;
};

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Popover"]["Content"]
>((props, ref) => {
  const {
    className,
    children,
    variant, // unused
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <MantinePopoverDropdown className={className} ref={ref}>
      {children}
    </MantinePopoverDropdown>
  );
});
