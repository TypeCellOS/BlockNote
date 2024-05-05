import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, ...rest } = props;

  assertEmpty(rest);

  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const setValue = (value: string) => {
    items.find((item) => item.text === value)!.onClick?.();
  };

  return (
    <Ariakit.SelectProvider value={selectedItem.text} setValue={setValue}>
      <Ariakit.Select
        className={"bn-ak-button bn-ak-secondary"}
        disabled={isDisabled}
        aria-label="Text alignment"
        render={<Ariakit.ToolbarItem />}>
        {selectedItem.icon} {selectedItem.text} <Ariakit.SelectArrow />
      </Ariakit.Select>
      <Ariakit.SelectPopover
        className={mergeCSSClasses("bn-ak-popover", className || "")}
        ref={ref}
        gutter={4}>
        {items.map((option) => (
          <Ariakit.SelectItem
            className={"bn-ak-select-item"}
            key={option.text}
            value={option.text}>
            {option.icon}
            {option.text}
            {option.text === selectedItem.text && <Ariakit.SelectItemCheck />}
          </Ariakit.SelectItem>
        ))}
      </Ariakit.SelectPopover>
    </Ariakit.SelectProvider>
  );
});
