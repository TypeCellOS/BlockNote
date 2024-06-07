import {
  Select as AriakitSelect,
  SelectArrow as AriakitSelectArrow,
  SelectItem as AriakitSelectItem,
  SelectItemCheck as AriakitSelectItemCheck,
  SelectPopover as AriakitSelectPopover,
  SelectProvider as AriakitSelectProvider,
  ToolbarItem as AriakitToolbarItem,
} from "@ariakit/react";

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
    <AriakitSelectProvider value={selectedItem.text} setValue={setValue}>
      <AriakitSelect
        className={"bn-ak-button bn-ak-secondary"}
        disabled={isDisabled}
        aria-label="Text alignment"
        render={<AriakitToolbarItem />}>
        {selectedItem.icon} {selectedItem.text} <AriakitSelectArrow />
      </AriakitSelect>
      <AriakitSelectPopover
        className={mergeCSSClasses("bn-ak-popover", className || "")}
        ref={ref}
        gutter={4}>
        {items.map((option) => (
          <AriakitSelectItem
            className={"bn-ak-select-item"}
            key={option.text}
            value={option.text}>
            {option.icon}
            {option.text}
            {option.text === selectedItem.text && <AriakitSelectItemCheck />}
          </AriakitSelectItem>
        ))}
      </AriakitSelectPopover>
    </AriakitSelectProvider>
  );
});
