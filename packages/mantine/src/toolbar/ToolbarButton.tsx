import { Stack, Text, Tooltip, Button, ActionIcon } from "@mantine/core";

import { assertEmpty, isSafari } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <Stack gap={0} className={"bn-tooltip"}>
    <Text size={"sm"}>{props.mainTooltip}</Text>
    {props.secondaryTooltip && (
      <Text size={"xs"}>{props.secondaryTooltip}</Text>
    )}
  </Stack>
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
      <Tooltip
        withinPortal={false}
        label={
          <TooltipContent
            mainTooltip={mainTooltip}
            secondaryTooltip={secondaryTooltip}
          />
        }>
        {/*Creates an ActionIcon instead of a Button if only an icon is provided as content.*/}
        {children ? (
          <Button
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
          </Button>
        ) : (
          <ActionIcon
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
          </ActionIcon>
        )}
      </Tooltip>
    );
  }
);
