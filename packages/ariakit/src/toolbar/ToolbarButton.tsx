import {
  ToolbarItem as AriakitToolbarItem,
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipProvider as AriakitTooltipProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { forwardRef, type HTMLAttributes, type MouseEvent } from "react";

// Ariakit merges its own props into a `render` element: its `createElement`
// clones the element with the trigger's HTML attributes, handlers and ref,
// the `React.HTMLAttributes` its `RenderProp` type declares. This button is
// the render element of the menu and popover triggers, so it receives those
// on top of the generic Button props.
type ToolbarButtonProps = ComponentProps["Generic"]["Toolbar"]["Button"] &
  HTMLAttributes<HTMLButtonElement>;

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
      onMouseDown: triggerMouseDown,
      ...rest
    } = props;

    // Every generic prop is taken above, so only what Ariakit injected may
    // remain: a forgotten generic prop fails to compile here. Type-level only;
    // at runtime the injected attributes are expected.
    assertEmpty(
      rest as Omit<typeof rest, keyof HTMLAttributes<HTMLButtonElement>>,
      false,
    );

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
