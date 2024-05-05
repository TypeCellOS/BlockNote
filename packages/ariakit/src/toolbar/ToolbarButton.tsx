import * as Ariakit from "@ariakit/react";

import { assertEmpty, isSafari, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

type ToolbarButtonProps = ComponentProps["FormattingToolbar"]["Button"] &
  ComponentProps["LinkToolbar"]["Button"];

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
      ...rest
    } = props;

    // false, because rest props can be added by ariakit when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    return (
      <Ariakit.TooltipProvider>
        <Ariakit.TooltipAnchor
          className="link"
          render={
            <Ariakit.ToolbarItem
              aria-label={label}
              className={mergeCSSClasses(
                "bn-ak-button bn-ak-secondary",
                className || ""
              )}
              // Needed as Safari doesn't focus button elements on mouse down
              // unlike other browsers.
              onMouseDown={(e) => {
                if (isSafari()) {
                  (e.currentTarget as HTMLButtonElement).focus();
                }
              }}
              onClick={onClick}
              aria-pressed={isSelected}
              data-selected={isSelected ? "true" : undefined}
              data-test={
                props.mainTooltip.slice(0, 1).toLowerCase() +
                props.mainTooltip.replace(/\s+/g, "").slice(1)
              }
              //   size={"xs"}
              disabled={isDisabled || false}
              ref={ref}
              {...rest}>
              {icon}
              {children}
            </Ariakit.ToolbarItem>
          }
        />
        <Ariakit.Tooltip className="bn-ak-tooltip">
          <span>{mainTooltip}</span>
          {secondaryTooltip && <span>{secondaryTooltip}</span>}
        </Ariakit.Tooltip>
      </Ariakit.TooltipProvider>
    );
  }
);
