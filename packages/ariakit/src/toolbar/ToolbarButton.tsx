import * as Ariakit from "@ariakit/react";

import { isSafari, mergeCSSClasses } from "@blocknote/core";
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
      ...rest
    } = props;

    return (
      <Ariakit.TooltipProvider>
        <Ariakit.TooltipAnchor
          className="link"
          render={
            <Ariakit.ToolbarItem
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
          <span>{secondaryTooltip}</span>
        </Ariakit.Tooltip>
      </Ariakit.TooltipProvider>
    );
  }
);
