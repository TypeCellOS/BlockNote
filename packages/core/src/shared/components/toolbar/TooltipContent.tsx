import styles from "./TooltipContent.module.css";
import React from "react";

/**
 * Helper for the tooltip for inline bubble menu buttons.
 *
 * Often used to display a tooltip showing the command name + keyboard shortcut, e.g.:
 *
 *      Bold
 *      Ctrl+B
 */
export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <div className={styles.tooltip}>
    <div>{props.mainTooltip}</div>
    {props.secondaryTooltip && (
      <div className={styles.secondaryText}>{props.secondaryTooltip}</div>
    )}
  </div>
);
