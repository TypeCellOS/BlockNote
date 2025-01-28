import { forwardRef } from "react";
import { ComponentProps } from "@blocknote/react";
import {
  Chip as MantineChip,
  Group as MantineGroup,
  Tooltip as MantineTooltip,
} from "@mantine/core";
import { assertEmpty } from "@blocknote/core";

import { TooltipContent } from "../toolbar/ToolbarButton.js";

export const Badge = forwardRef<
  HTMLInputElement,
  ComponentProps["Generic"]["Badge"]["Root"]
>((props, ref) => {
  const {
    className,
    text,
    icon,
    isSelected,
    mainTooltip,
    secondaryTooltip,
    onClick,
    ...rest
  } = props;

  // false, because rest props can be added by mantine when chip is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  const badge = (
    <MantineChip
      className={className}
      checked={isSelected === true}
      onClick={onClick}
      variant={"light"}
      ref={ref}>
      <span>{icon}</span>
      <span>{text}</span>
    </MantineChip>
  );

  if (!mainTooltip) {
    return badge;
  }

  return (
    <MantineTooltip
      refProp="rootRef"
      withinPortal={false}
      label={
        <TooltipContent
          mainTooltip={mainTooltip}
          secondaryTooltip={secondaryTooltip}
        />
      }
      multiline>
      {badge}
    </MantineTooltip>
  );
});

export const BadgeGroup = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Group"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantineGroup className={className} ref={ref}>
      {children}
    </MantineGroup>
  );
});
