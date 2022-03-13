import Button from "@atlaskit/button";
import Tippy from "@tippyjs/react";
import { forwardRef } from "react";
import styles from "./SimpleToolbarButton.module.css";
import { TooltipContent } from "./TooltipContent";
import React from "react";

export type SimpleToolbarButtonProps = {
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ComponentType<{ className: string }>;
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
        <Button
          ref={ref as any}
          appearance="subtle"
          onClick={props.onClick}
          isSelected={props.isSelected || false}
          isDisabled={props.isDisabled || false}
          iconBefore={
            ButtonIcon && (
              <ButtonIcon
                className={
                  styles.icon +
                  " " +
                  (props.isSelected ? styles.isSelected : "") +
                  " " +
                  (props.isDisabled ? styles.isDisabled : "")
                }
              />
            )
          }>
          {props.children}
        </Button>
      </Tippy>
    );
  }
);
