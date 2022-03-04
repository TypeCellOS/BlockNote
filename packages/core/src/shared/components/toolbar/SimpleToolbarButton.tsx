import Button from "@atlaskit/button";
import Tippy from "@tippyjs/react";
import { forwardRef } from "react";
import styles from "./SimpleToolbarButton.module.css";
import { TooltipContent } from "./TooltipContent";

export type SimpleToolbarButtonProps = {
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ComponentType<{ className: string }>;
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected: boolean;
  children?: any;
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
          isSelected={props.isSelected}
          iconBefore={
            ButtonIcon && (
              <ButtonIcon
                className={
                  styles.icon +
                  " " +
                  (props.isSelected ? styles.isSelected : "")
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
