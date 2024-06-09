import {
  ActionIcon as MantineActionIcon,
  Button as MantineButton,
  Stack as MantineStack,
  Text as MantineText,
  Tooltip as MantineTooltip,
} from "@mantine/core";

import { assertEmpty, isSafari } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <MantineStack gap={0} className={"bn-tooltip"}>
    <MantineText size={"sm"}>{props.mainTooltip}</MantineText>
    {props.secondaryTooltip && (
      <MantineText size={"xs"}>{props.secondaryTooltip}</MantineText>
    )}
  </MantineStack>
);

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

    // false, because rest props can be added by mantine when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    return (
      <MantineTooltip
        withinPortal={false}
        label={
          <TooltipContent
            mainTooltip={mainTooltip}
            secondaryTooltip={secondaryTooltip}
          />
        }>
        {/*Creates an ActionIcon instead of a Button if only an icon is provided as content.*/}
        {children ? (
          <MantineButton
            aria-label={label}
            className={className}
            // Needed as Safari doesn't focus button elements on mouse down
            // unlike other browsers.
            onMouseDown={(e) => {
              if (isSafari()) {
                (e.currentTarget as HTMLButtonElement).focus();
              }
            }}
            onClick={onClick}
            aria-pressed={isSelected}
            data-selected={isSelected || undefined}
            data-test={
              mainTooltip.slice(0, 1).toLowerCase() +
              mainTooltip.replace(/\s+/g, "").slice(1)
            }
            size={"xs"}
            disabled={isDisabled || false}
            ref={ref}
            {...rest}>
            {children}
          </MantineButton>
        ) : (
          <MantineActionIcon
            className={className}
            aria-label={label}
            // Needed as Safari doesn't focus button elements on mouse down
            // unlike other browsers.
            onMouseDown={(e) => {
              if (isSafari()) {
                (e.currentTarget as HTMLButtonElement).focus();
              }
            }}
            onClick={onClick}
            aria-pressed={isSelected}
            data-selected={isSelected || undefined}
            data-test={
              mainTooltip.slice(0, 1).toLowerCase() +
              mainTooltip.replace(/\s+/g, "").slice(1)
            }
            size={30}
            disabled={isDisabled || false}
            ref={ref}
            {...rest}>
            {icon}
          </MantineActionIcon>
        )}
      </MantineTooltip>
    );
  }
);
