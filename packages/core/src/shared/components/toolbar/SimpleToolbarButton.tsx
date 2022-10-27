import { ActionIcon } from "@mantine/core";
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
    // const theme = useMantineTheme();
    const ButtonIcon = props.icon;
    return (
      <Tippy
        content={
          <TooltipContent
            mainTooltip={props.mainTooltip}
            secondaryTooltip={props.secondaryTooltip}
          />
        }>
        <ActionIcon
          size={30}
          ref={ref as any}
          color={"brand3"}
          variant={props.isSelected ? "filled" : "subtle"}
          onClick={props.onClick}
          disabled={props.isDisabled || false}>
          {ButtonIcon && <ButtonIcon />}
          {props.children}
        </ActionIcon>
      </Tippy>
    );
  }
);
