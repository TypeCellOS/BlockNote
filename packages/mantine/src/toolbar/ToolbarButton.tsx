import * as Mantine from "@mantine/core";

import { isSafari } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <Mantine.Stack gap={0} className={"bn-tooltip"}>
    <Mantine.Text size={"sm"}>{props.mainTooltip}</Mantine.Text>
    {props.secondaryTooltip && (
      <Mantine.Text size={"xs"}>{props.secondaryTooltip}</Mantine.Text>
    )}
  </Mantine.Stack>
);

type ToolbarButtonProps = ComponentProps["FormattingToolbar"]["Button"] &
  ComponentProps["LinkToolbar"]["Button"];

/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (props, ref) => (
    <Mantine.Tooltip
      withinPortal={false}
      label={
        <TooltipContent
          mainTooltip={props.mainTooltip}
          secondaryTooltip={props.secondaryTooltip}
        />
      }>
      {/*Creates an ActionIcon instead of a Button if only an icon is provided as content.*/}
      {props.children ? (
        <Mantine.Button
          className={props.className}
          // Needed as Safari doesn't focus button elements on mouse down
          // unlike other browsers.
          onMouseDown={(e) => {
            if (isSafari()) {
              (e.currentTarget as HTMLButtonElement).focus();
            }
          }}
          onClick={props.onClick}
          data-selected={props.isSelected ? "true" : undefined}
          data-test={
            props.mainTooltip.slice(0, 1).toLowerCase() +
            props.mainTooltip.replace(/\s+/g, "").slice(1)
          }
          size={"xs"}
          disabled={props.isDisabled || false}
          ref={ref}>
          {props.icon}
          {props.children}
        </Mantine.Button>
      ) : (
        <Mantine.ActionIcon
          className={props.className}
          // Needed as Safari doesn't focus button elements on mouse down
          // unlike other browsers.
          onMouseDown={(e) => {
            if (isSafari()) {
              (e.currentTarget as HTMLButtonElement).focus();
            }
          }}
          onClick={props.onClick}
          data-selected={props.isSelected ? "true" : undefined}
          data-test={
            props.mainTooltip.slice(0, 1).toLowerCase() +
            props.mainTooltip.replace(/\s+/g, "").slice(1)
          }
          size={30}
          disabled={props.isDisabled || false}
          ref={ref}>
          {props.icon}
        </Mantine.ActionIcon>
      )}
    </Mantine.Tooltip>
  )
);
