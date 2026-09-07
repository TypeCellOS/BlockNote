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
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { forwardRef } from "react";

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const {
    className,
    items,
    isDisabled,
    portalElement,
    preventFocusOnOpen,
    ...rest
  } = props;

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
        // How-to-test: without it, tapping the block type select focuses the button and closes the keyboard (covered by skinFocus, android, ariakit: "opening the block type select keeps focus in the editor").
        onMouseDown={preventFocusOnTap}
        render={<AriakitToolbarItem />}
      >
        {selectedItem.icon} {selectedItem.text} <AriakitSelectArrow />
      </AriakitSelect>
      <AriakitSelectPopover
        className={mergeCSSClasses("bn-ak-popover", className || "")}
        ref={ref}
        gutter={4}
        // Ariakit's default focuses the listbox on show; on the mobile toolbar
        // that blurs the editor and closes the keyboard.
        // How-to-test: without it, opening the block type select focuses the listbox and closes the keyboard (covered by skinFocus, android, ariakit: "opening the block type select keeps focus in the editor").
        autoFocusOnShow={!preventFocusOnOpen}
        // Ariakit falls back to a body-appended div for a missing element,
        // so don't portal at all until there is one (editor not mounted yet).
        portal={portalElement !== null}
        portalElement={portalElement}
      >
        {items.map((option) => (
          <AriakitSelectItem
            className={"bn-ak-select-item"}
            key={option.text}
            value={option.text}
            // A tap must not focus the option; under `preventFocusOnOpen`,
            // hovering one (a tap's compat mousemove included) must not focus
            // the listbox either.
            // How-to-test: with hover focus on, tapping a block type focuses the listbox through the tap's compat mousemove and closes the keyboard (covered by skinFocus, android, ariakit: "picking from the block type select leaves focus in the editor").
            focusOnHover={!preventFocusOnOpen}
            // How-to-test: without the tap guard, tapping a block type focuses the option and closes the keyboard (covered by the same case).
            onMouseDown={preventFocusOnTap}
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
