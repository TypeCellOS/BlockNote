import { Button, Menu } from "@mantine/core";
import { usePreventMenuOverflow } from "../../../hooks/usePreventMenuOverflow";
import { ToolbarSelectItem, ToolbarSelectItemProps } from "./ToolbarSelectItem";
import { isSafari } from "@blocknote/core";
import { HiChevronDown } from "react-icons/hi";

export type ToolbarSelectProps = {
  items: ToolbarSelectItemProps[];
  isDisabled?: boolean;
};

export function ToolbarSelect(props: ToolbarSelectProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

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
      onOpen={updateMaxHeight}>
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
      <div ref={ref}>
        <Menu.Dropdown>
          {props.items.map((item) => (
            <ToolbarSelectItem key={item.text} {...item} />
          ))}
        </Menu.Dropdown>
      </div>
    </Menu>
  );
}
