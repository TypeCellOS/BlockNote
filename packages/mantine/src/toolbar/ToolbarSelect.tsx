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
  const { className, items, isDisabled, portalElement, ...rest } = props;

  assertEmpty(rest);

  const selectedItem = items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <MantineMenu
      withinPortal={!!portalElement}
      portalProps={portalElement ? { target: portalElement } : undefined}
      transitionProps={{
        exitDuration: 0,
      }}
      disabled={isDisabled}
      // Do not move focus to the dropdown on mobile, as it blurs the editor's
      // contentEditable and dismisses the on-screen keyboard.
      trapFocus={portalElement ? false : undefined}
      middlewares={{
        flip: true,
        shift: true,
        inline: false,
        size: true,
      }}
    >
      <MantineMenu.Target>
        <MantineButton
          onMouseDown={(e) => {
            // On touch, keep focus on the editor (so the on-screen keyboard
            // stays open) without canceling the tap's click. `mousedown` is the
            // compat event that moves focus, so preventing it keeps focus here
            // while the click still fires. Preventing `pointerdown` instead
            // suppresses the synthesized click on iOS WebKit.
            if (isTouchDevice()) {
              e.preventDefault();
              return;
            }

            // Needed as Safari doesn't focus button elements on mouse down
            // unlike other browsers.
            if (isSafari()) {
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
