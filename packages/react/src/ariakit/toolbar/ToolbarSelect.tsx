import * as Ariakit from "@ariakit/react";
import { ToolbarSelectProps } from "../../components/mantine-shared/Toolbar/ToolbarSelect";

export function ToolbarSelect(props: ToolbarSelectProps) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const setValue = (value: string) => {
    props.items.find((item) => item.text === value)!.onClick?.();
  };

  return (
    <Ariakit.SelectProvider value={selectedItem.text} setValue={setValue}>
      <Ariakit.Select
        aria-label="Text alignment"
        className="button secondary"
        render={<Ariakit.ToolbarItem />}>
        {selectedItem.icon && <selectedItem.icon />} {selectedItem.text}{" "}
        <Ariakit.SelectArrow />
      </Ariakit.Select>
      <Ariakit.SelectPopover gutter={4} className="popover">
        {props.items.map((option) => (
          <Ariakit.SelectItem
            key={option.text}
            value={option.text}
            className="select-item">
            {option.icon && <option.icon />} {option.text}
          </Ariakit.SelectItem>
        ))}
      </Ariakit.SelectPopover>
    </Ariakit.SelectProvider>
  );
}
