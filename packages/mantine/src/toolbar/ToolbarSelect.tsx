import * as Mantine from "@mantine/core";

import { isSafari } from "@blocknote/core";
import { ToolbarSelectProps } from "@blocknote/react";
import { HiChevronDown } from "react-icons/hi";

import { ToolbarSelectItem } from "./ToolbarSelectItem";

// TODO: turn into select
export function ToolbarSelect(props: ToolbarSelectProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <Mantine.Menu
      withinPortal={false}
      transitionProps={{
        exitDuration: 0,
      }}
      disabled={props.isDisabled}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}>
      <Mantine.Menu.Target>
        <Mantine.Button
          // Needed as Safari doesn't focus button elements on mouse down
          // unlike other browsers.
          onMouseDown={(e) => {
            if (isSafari()) {
              (e.currentTarget as HTMLButtonElement).focus();
            }
          }}
          leftSection={selectedItem.icon}
          rightSection={<HiChevronDown />}
          size={"xs"}
          variant={"subtle"}
          disabled={props.isDisabled}>
          {selectedItem.text}
        </Mantine.Button>
      </Mantine.Menu.Target>
      <Mantine.Menu.Dropdown>
        {props.items.map((item) => (
          <ToolbarSelectItem key={item.text} {...item} />
        ))}
      </Mantine.Menu.Dropdown>
    </Mantine.Menu>
  );
}
