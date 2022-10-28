import { ActionIcon, Button } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { forwardRef } from "react";
import { TooltipContent } from "../tooltip/TooltipContent";
import React from "react";
import { IconType } from "react-icons";

export type SimpleToolbarButtonProps = {
  onClick?: (e: React.MouseEvent) => void;
  icon?: IconType;
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

/**
 * Helper for basic buttons that show in the inline bubble menu.
 */
export const SimpleToolbarButton = forwardRef(
  (props: SimpleToolbarButtonProps, ref) => {
    const ButtonIcon = props.icon;
    return (
      <Tippy
        content={
          <TooltipContent
            mainTooltip={props.mainTooltip}
            secondaryTooltip={props.secondaryTooltip}
          />
        }>
        {props.children ? (
          <Button
            onClick={props.onClick}
            color={"brandFinal"}
            size={"xs"}
            variant={props.isSelected ? "filled" : "subtle"}
            disabled={props.isDisabled || false}
            ref={ref as any}>
            {ButtonIcon && <ButtonIcon />}
            {props.children}
          </Button>
        ) : (
          <ActionIcon
            onClick={props.onClick}
            color={"brandFinal"}
            size={30}
            variant={props.isSelected ? "filled" : "subtle"}
            disabled={props.isDisabled || false}
            ref={ref as any}>
            {ButtonIcon && <ButtonIcon />}
          </ActionIcon>
        )}
      </Tippy>
    );
  }
);
