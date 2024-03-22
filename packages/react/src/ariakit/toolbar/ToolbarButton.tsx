import * as Ariakit from "@ariakit/react";
import { isSafari } from "@blocknote/core";
import { forwardRef } from "react";

export type ToolbarButtonProps = {
  onClick?: (e: React.MouseEvent) => void;
  icon?: any; // IconType; TODO
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (props, ref) => {
    const ButtonIcon = props.icon;

    return (
      <Ariakit.ToolbarItem
        className="button secondary"
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
        //   size={"xs"}
        disabled={props.isDisabled || false}
        ref={ref}>
        {ButtonIcon && <ButtonIcon />}
        {props.children}
      </Ariakit.ToolbarItem>
    );

    return (
      <Ariakit.TooltipProvider>
        <Ariakit.TooltipAnchor
          className="link"
          render={
            <Ariakit.ToolbarItem
              className="button secondary"
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
              //   size={"xs"}
              disabled={props.isDisabled || false}
              ref={ref}></Ariakit.ToolbarItem>
          }>
          {ButtonIcon && <ButtonIcon />}
          {props.children}
        </Ariakit.TooltipAnchor>
        <Ariakit.Tooltip className="tooltip">
          <div>{props.mainTooltip}</div>
          {props.secondaryTooltip && <div>{props.secondaryTooltip}</div>}
        </Ariakit.Tooltip>
      </Ariakit.TooltipProvider>
    );
  }
);
