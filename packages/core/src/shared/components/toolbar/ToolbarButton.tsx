import { ActionIcon, Button } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { forwardRef } from "react";
import { TooltipContent } from "../tooltip/TooltipContent";
import React from "react";
import { IconType } from "react-icons";
import useStyles from "./ToolbarButton.styles";

export type ToolbarButtonProps = {
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
export const ToolbarButton = forwardRef((props: ToolbarButtonProps, ref) => {
  const { classes } = useStyles(undefined, { name: "ToolbarButton" });

  const ButtonIcon = props.icon;
  return (
    <Tippy
      content={
        <TooltipContent
          mainTooltip={props.mainTooltip}
          secondaryTooltip={props.secondaryTooltip}
        />
      }>
      {/*Creates an ActionIcon instead of a Button if only an icon is provided as content.*/}
      {props.children ? (
        <Button
          classNames={{
            icon: classes.icon,
            inner: classes.inner,
            label: classes.label,
            leftIcon: classes.leftIcon,
            rightIcon: classes.rightIcon,
            root: classes.root,
          }}
          onClick={props.onClick}
          // TODO: Add default styling props to theming
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
});
