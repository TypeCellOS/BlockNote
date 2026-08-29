import {
  ToolbarItem as AriakitToolbarItem,
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipProvider as AriakitTooltipProvider,
} from "@ariakit/react";

import {
  assertEmpty,
  isSafari,
  isTouchDevice,
  mergeCSSClasses,
} from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
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
              onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                // On touch, keep focus where it is (so the on-screen keyboard
                // stays open) without canceling the tap's click. `mousedown`
                // is the compat event that moves focus, so preventing it keeps
                // focus in place while the click still fires. It also keeps
                // the focus-triggered inline tooltip from inserting itself
                // mid-tap — the layout shift moved the button between
                // mousedown and mouseup, and the click never completed.
                if (isTouchDevice()) {
                  e.preventDefault();
                  return;
                }

                // Needed as Safari doesn't focus button elements on mouse
                // down unlike other browsers.
                if (isSafari()) {
                  (e.currentTarget as HTMLButtonElement).focus();
                }
              }}
              onClick={onClick}
              aria-pressed={isSelected}
              data-selected={isSelected ? "true" : undefined}
              disabled={isDisabled || false}
              ref={ref}
              {...rest}
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
