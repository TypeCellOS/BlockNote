import { ActionIcon, Button } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { ForwardedRef, forwardRef, MouseEvent } from "react";
import { TooltipContent } from "../../Tooltip/components/TooltipContent";
import { IconType } from "react-icons";

export type ToolbarButtonProps = {
  onClick?: (e: MouseEvent) => void;
  icon?: IconType;
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
export const ToolbarButton = forwardRef(
  (props: ToolbarButtonProps, ref: ForwardedRef<HTMLButtonElement>) => {
    const ButtonIcon = props.icon;
    return (
      <Tippy
        content={
          <TooltipContent
            mainTooltip={props.mainTooltip}
            secondaryTooltip={props.secondaryTooltip}
          />
        }
        trigger={"mouseenter"}>
        {/*Creates an ActionIcon instead of a Button if only an icon is provided as content.*/}
        {props.children ? (
          <Button
            onClick={props.onClick}
            data-selected={props.isSelected ? "true" : undefined}
            data-test={
              props.mainTooltip.slice(0, 1).toLowerCase() +
              props.mainTooltip.replace(/\s+/g, "").slice(1)
            }
            size={"xs"}
            disabled={props.isDisabled || false}
            ref={ref}>
            {ButtonIcon && <ButtonIcon />}
            {props.children}
          </Button>
        ) : (
          <ActionIcon
            onClick={props.onClick}
            data-selected={props.isSelected ? "true" : undefined}
            data-test={
              props.mainTooltip.slice(0, 1).toLowerCase() +
              props.mainTooltip.replace(/\s+/g, "").slice(1)
            }
            size={30}
            disabled={props.isDisabled || false}
            ref={ref}>
            {ButtonIcon && <ButtonIcon />}
          </ActionIcon>
        )}
      </Tippy>
    );
  }
);
