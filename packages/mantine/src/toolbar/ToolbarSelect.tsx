import {
  Button as MantineButton,
  CheckIcon as MantineCheckIcon,
  Menu as MantineMenu,
} from "@mantine/core";

import { assertEmpty, isSafari, isTouchDevice } from "@blocknote/core";
import { ComponentProps, PortalContext } from "@blocknote/react";
import { forwardRef, useContext } from "react";
import { HiChevronDown } from "react-icons/hi";

// TODO: Turn into select?
export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, ...rest } = props;

  assertEmpty(rest);

  // The DOM node the dropdown portals into, e.g. the mobile formatting
  // toolbar's non-scrolling wrapper. `null` when there's no such target.
  const portalRoot = useContext(PortalContext);

  const selectedItem = items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <MantineMenu
      withinPortal={!!portalRoot}
      portalProps={portalRoot ? { target: portalRoot } : undefined}
      transitionProps={{
        exitDuration: 0,
      }}
      disabled={isDisabled}
      // Do not move focus to dropdown on mobile.
      trapFocus={portalRoot ? false : undefined}
      middlewares={{
        flip: true,
        shift: true,
        inline: false,
        size: true,
      }}
    >
      <MantineMenu.Target>
        <MantineButton
          onPointerDown={(e) => {
            // Prevents focus shift on mo
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
