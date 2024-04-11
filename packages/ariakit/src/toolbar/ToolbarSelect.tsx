import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export function ToolbarSelect(
  props: ComponentProps["FormattingToolbar"]["Select"]
) {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const setValue = (value: string) => {
    props.items.find((item) => item.text === value)!.onClick?.();
  };

  return (
    <Ariakit.SelectProvider value={selectedItem.text} setValue={setValue}>
      <Ariakit.Select
        aria-label="Text alignment"
        render={<Ariakit.ToolbarItem />}>
        {selectedItem.icon} {selectedItem.text} <Ariakit.SelectArrow />
      </Ariakit.Select>
      <Ariakit.SelectPopover className={props.className} gutter={4}>
        {props.items.map((option) => (
          <Ariakit.SelectItem key={option.text} value={option.text}>
            {option.icon}
            {option.text}
          </Ariakit.SelectItem>
        ))}
      </Ariakit.SelectPopover>
    </Ariakit.SelectProvider>
  );
}
