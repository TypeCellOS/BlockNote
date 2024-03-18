import { isSafari } from "@blocknote/core";
import { Button, Menu } from "@mantine/core";
import { HiChevronDown } from "react-icons/hi";
import { ToolbarSelectItem, ToolbarSelectItemProps } from "./ToolbarSelectItem";

export type ToolbarSelectProps = {
  items: ToolbarSelectItemProps[];
  isDisabled?: boolean;
};

export function ToolbarSelect(props: ToolbarSelectProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  const Icon = selectedItem.icon;

  return (
    <Menu
      withinPortal={false}
      transitionProps={{
        exitDuration: 0,
      }}
      disabled={props.isDisabled}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}>
      <Menu.Target>
        <Button
          // Needed as Safari doesn't focus button elements on mouse down
          // unlike other browsers.
          onMouseDown={(e) => {
            if (isSafari()) {
              (e.currentTarget as HTMLButtonElement).focus();
            }
          }}
          leftSection={Icon && <Icon size={16} />}
          rightSection={<HiChevronDown />}
          size={"xs"}
          variant={"subtle"}
          disabled={props.isDisabled}>
          {selectedItem.text}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {props.items.map((item) => (
          <ToolbarSelectItem key={item.text} {...item} />
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
