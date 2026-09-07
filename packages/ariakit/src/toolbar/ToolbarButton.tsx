import {
  ToolbarItem as AriakitToolbarItem,
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipProvider as AriakitTooltipProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { forwardRef, type MouseEvent } from "react";

type ToolbarButtonProps = ComponentProps["Generic"]["Toolbar"]["Button"];

/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (props, ref) => {
    const {
      className,
      children,
      mainTooltip,
      secondaryTooltip,
      icon,
      isSelected,
      isDisabled,
      onClick,
      label,
      variant: _variant,
      ...rest
    } = props;

    // false, because rest props can be added by ariakit when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    // Ariakit injects its own `onMouseDown` into `rest` when this button is a
    // popover or menu trigger. `rest` is spread first so ours is not replaced,
    // and ours forwards to it (see `preventFocusOnTap`).
    const triggerMouseDown = (
      rest as { onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void }
    ).onMouseDown;

    return (
      <AriakitTooltipProvider>
        <AriakitTooltipAnchor
          render={
            <AriakitToolbarItem
              aria-label={label}
              className={mergeCSSClasses(
                "bn-ak-button bn-ak-secondary",
                className || "",
              )}
              {...rest}
              onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                // On touch this also keeps the focus-triggered tooltip from
                // inserting itself mid-tap: the layout shift moved the button
                // between mousedown and mouseup, and the click never completed.
                preventFocusOnTap(e);
                triggerMouseDown?.(e);
              }}
              onClick={onClick}
              aria-pressed={isSelected}
              data-selected={isSelected ? "true" : undefined}
              disabled={isDisabled || false}
              ref={ref}
            >
              {icon}
              {children}
            </AriakitToolbarItem>
          }
        />
        <AriakitTooltip className="bn-ak-tooltip" portal={false}>
          <span>{mainTooltip}</span>
          {secondaryTooltip && <span>{secondaryTooltip}</span>}
        </AriakitTooltip>
      </AriakitTooltipProvider>
    );
  },
);
