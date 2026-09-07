import {
  ActionIcon as MantineActionIcon,
  Button as MantineButton,
  Stack as MantineStack,
  Text as MantineText,
  Tooltip as MantineTooltip,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, preventFocusOnTap } from "@blocknote/react";
import { forwardRef, useState } from "react";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <MantineStack gap={0} className={"bn-tooltip"}>
    <MantineText size={"sm"} lineClamp={5}>
      {props.mainTooltip}
    </MantineText>
    {props.secondaryTooltip && (
      <MantineText size={"xs"} lineClamp={5}>
        {props.secondaryTooltip}
      </MantineText>
    )}
  </MantineStack>
);

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
      variant,
      ...rest
    } = props;

    // false, because rest props can be added by mantine when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    const [hideTooltip, setHideTooltip] = useState(false);

    const button = children ? (
      <MantineButton
        aria-label={label}
        className={className}
        // How-to-test: without it (here and below), tapping Bold on the mobile toolbar focuses the button and closes the keyboard (covered by skinFocus, android, mantine: "tapping a toggle button never moves focus onto it").
        onMouseDown={preventFocusOnTap}
        onClick={(event) => {
          setHideTooltip(true);
          onClick?.(event);
        }}
        // Mantine Menu.Target elements block mouseleave events for some reason,
        // but pointerleave events work fine.
        onPointerLeave={() => setHideTooltip(false)}
        aria-pressed={isSelected}
        data-selected={isSelected || undefined}
        data-test={
          mainTooltip
            ? mainTooltip.slice(0, 1).toLowerCase() +
              mainTooltip.replace(/\s+/g, "").slice(1)
            : undefined
        }
        size={variant === "compact" ? "compact-xs" : "xs"}
        disabled={isDisabled || false}
        ref={ref}
        {...rest}
      >
        {children}
      </MantineButton>
    ) : (
      <MantineActionIcon
        className={className}
        aria-label={label}
        onMouseDown={preventFocusOnTap}
        onClick={(event) => {
          // We manually hide the tooltip onclick, because the click event
          // might open a popover which would then show both the tooltip and the popover
          // this is similar to default behavior of shadcn / radix
          setHideTooltip(true);
          onClick?.(event);
        }}
        // Mantine Menu.Target elements block mouseleave events for some reason,
        // but pointerleave events work fine.
        onPointerLeave={() => setHideTooltip(false)}
        aria-pressed={isSelected}
        data-selected={isSelected || undefined}
        data-test={
          mainTooltip
            ? mainTooltip.slice(0, 1).toLowerCase() +
              mainTooltip.replace(/\s+/g, "").slice(1)
            : undefined
        }
        size={variant === "compact" ? 20 : 30}
        disabled={isDisabled || false}
        ref={ref}
        {...rest}
      >
        {icon}
      </MantineActionIcon>
    );

    if (!mainTooltip) {
      return button;
    }

    return (
      <MantineTooltip
        disabled={hideTooltip}
        withinPortal={false}
        label={
          <TooltipContent
            mainTooltip={mainTooltip}
            secondaryTooltip={secondaryTooltip}
          />
        }
      >
        {button}
      </MantineTooltip>
    );
  },
);
