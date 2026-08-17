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
import { ComponentProps, PortalContext } from "@blocknote/react";
import { forwardRef, useContext } from "react";

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, ...rest } = props;

  assertEmpty(rest);

  // The DOM node the dropdown portals into, e.g. the mobile formatting
  // toolbar's non-scrolling wrapper. `null` when there's no such target.
  const portalRoot = useContext(PortalContext);

  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  const setValue = (value: string) => {
    items.find((item) => item.text === value)!.onClick?.();
  };

  return (
    <AriakitSelectProvider
      value={selectedItem.text}
      setValue={setValue}
      placement={"bottom"}
    >
      <AriakitSelect
        className={"bn-ak-button bn-ak-secondary"}
        disabled={isDisabled}
        aria-label="Text alignment"
        render={<AriakitToolbarItem />}
      >
        {selectedItem.icon} {selectedItem.text} <AriakitSelectArrow />
      </AriakitSelect>
      <AriakitSelectPopover
        className={mergeCSSClasses("bn-ak-popover", className || "")}
        ref={ref}
        gutter={4}
        portalElement={portalRoot ?? undefined}
      >
        {items.map((option) => (
          <AriakitSelectItem
            className={"bn-ak-select-item"}
            key={option.text}
            value={option.text}
          >
            {option.icon}
            {option.text}
            {option.text === selectedItem.text && <AriakitSelectItemCheck />}
          </AriakitSelectItem>
        ))}
      </AriakitSelectPopover>
    </AriakitSelectProvider>
  );
});
