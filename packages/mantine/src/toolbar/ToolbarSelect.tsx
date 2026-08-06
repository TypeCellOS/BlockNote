import {
  Button as MantineButton,
  CheckIcon as MantineCheckIcon,
  Menu as MantineMenu,
} from "@mantine/core";

import { assertEmpty, isSafari, isTouchDevice } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";
import { HiChevronDown } from "react-icons/hi";

// TODO: Turn into select?
export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, direction, ...rest } = props;

  assertEmpty(rest);

  const selectedItem = items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <MantineMenu
      withinPortal={false}
      position={direction === "up" ? "top-start" : "bottom-start"}
      transitionProps={{
        exitDuration: 0,
      }}
      disabled={isDisabled}
      // Don't move focus into the dropdown on open: on mobile that blurs the
      // editor's contentEditable and dismisses the on-screen keyboard.
      // `withInitialFocusPlaceholder={false}` drops the focusable placeholder
      // Mantine otherwise autofocuses.
      trapFocus={false}
      returnFocus={false}
      withInitialFocusPlaceholder={false}
      // When opening upward (mobile, above the keyboard) don't let `flip` send
      // it back down: there's always room above and floating-ui's overflow
      // detection is unreliable inside the transformed toolbar.
      middlewares={{
        flip: direction !== "up",
        shift: true,
        inline: false,
        size: true,
      }}
    >
      <MantineMenu.Target>
        <MantineButton
          // Needed as Safari doesn't focus button elements on mouse down
          // unlike other browsers.
          onMouseDown={(e) => {
            if (isSafari() && !isTouchDevice()) {
              (e.currentTarget as HTMLButtonElement).focus();
            }
          }}
          leftSection={selectedItem.icon}
          rightSection={<HiChevronDown />}
          size={"xs"}
          variant={"subtle"}
          disabled={isDisabled}
        >
          {selectedItem.text}
        </MantineButton>
      </MantineMenu.Target>
      <MantineMenu.Dropdown className={className} ref={ref}>
        {items.map((item) => (
          <MantineMenu.Item
            key={item.text}
            onClick={item.onClick}
            leftSection={item.icon}
            rightSection={
              item.isSelected ? (
                <MantineCheckIcon size={10} className={"bn-tick-icon"} />
              ) : (
                // Ensures space for tick even if item isn't currently selected.
                <div className={"bn-tick-space"} />
              )
            }
            disabled={item.isDisabled}
          >
            {item.text}
          </MantineMenu.Item>
        ))}
      </MantineMenu.Dropdown>
    </MantineMenu>
  );
});
